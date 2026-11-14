import { FieldValue, getFirestore, Timestamp, type DocumentReference } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import {
  OPEN_STATUSES,
  type MessageDoc,
  type OrderDoc,
  type OrderItem,
  type ProductDoc,
  type ShopSettings,
  type UserDoc,
} from './models';
import { adminRecipients, itemsSummary, sendPush, shortName, userRecipient } from './push';
import { recomputeQueue } from './queue';
import { applyStats, isClosed } from './stats';
import { istanbulDate } from './time';

const MAX_LINES = 15;
const MAX_QTY = 10;
const ITEM_NOTE_MAX = 140;
const ORDER_NOTE_MAX = 200;
// İstemcinin ürettiği istek kimliği sipariş id'si olur: aynı istek iki kez gelirse ikinci sipariş oluşmaz
const REQUEST_ID_RE = /^[A-Za-z0-9]{16,40}$/;

interface PlaceOrderInput {
  requestId?: unknown;
  items?: unknown;
  note?: unknown;
}

interface CleanItem {
  productId: string;
  variantId: string;
  qty: number;
  note: string | null;
}

function cleanNote(value: unknown, max: number, label: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new HttpsError('invalid-argument', `${label} geçersiz.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HttpsError('invalid-argument', `${label} en fazla ${max} karakter olabilir.`);
  return trimmed.length > 0 ? trimmed : null;
}

function parseItems(value: unknown): CleanItem[] {
  if (!Array.isArray(value) || value.length < 1) {
    throw new HttpsError('invalid-argument', 'Sepetin boş.');
  }
  if (value.length > MAX_LINES) {
    throw new HttpsError('invalid-argument', `Bir siparişte en fazla ${MAX_LINES} farklı ürün olabilir.`);
  }
  return value.map((raw: unknown) => {
    if (typeof raw !== 'object' || raw === null) throw new HttpsError('invalid-argument', 'Sepetteki bir ürün geçersiz.');
    const item = raw as Record<string, unknown>;
    const { productId, variantId, qty } = item;
    if (typeof productId !== 'string' || typeof variantId !== 'string' || !productId || !variantId) {
      throw new HttpsError('invalid-argument', 'Sepetteki bir ürün geçersiz.');
    }
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new HttpsError('invalid-argument', `Bir üründen en fazla ${MAX_QTY} adet sipariş verebilirsin.`);
    }
    return { productId, variantId, qty, note: cleanNote(item.note, ITEM_NOTE_MAX, 'Ürün notu') };
  });
}

// ---------------------------------------------------------------------------
// placeOrder (PROJE.md 8.3)
// ---------------------------------------------------------------------------

export const placeOrder = onCall<PlaceOrderInput>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Önce giriş yapmalısın.');

  const input = request.data ?? {};
  const requestId = typeof input.requestId === 'string' ? input.requestId : '';
  if (!REQUEST_ID_RE.test(requestId)) throw new HttpsError('invalid-argument', 'Geçersiz istek. Uygulamayı güncelleyip tekrar dene.');
  const items = parseItems(input.items);
  const orderNote = cleanNote(input.note, ORDER_NOTE_MAX, 'Sipariş notu');

  const db = getFirestore();
  const orderRef = db.doc(`orders/${requestId}`) as DocumentReference<OrderDoc>;

  // Aynı istek ikinci kez geldiyse (çift dokunuş, ağ tekrarı) ilk siparişi döndür
  const already = await orderRef.get();
  if (already.exists) {
    const data = already.data();
    if (data?.userId !== uid) throw new HttpsError('already-exists', 'Geçersiz istek.');
    return { orderId: orderRef.id, orderNo: data.orderNo };
  }

  const [userSnap, shopSnap] = await Promise.all([db.doc(`users/${uid}`).get(), db.doc('settings/shop').get()]);
  const user = userSnap.data() as UserDoc | undefined;
  if (!user || user.status !== 'active') throw new HttpsError('permission-denied', 'Hesabın askıya alınmış.');
  const shop = shopSnap.data() as ShopSettings | undefined;
  if (!shop?.isOpen) throw new HttpsError('failed-precondition', 'Kantin şu an kapalı.', { reason: 'closed' });
  if (shop.prayerBreak) {
    throw new HttpsError('failed-precondition', 'Ramazan abi namazda. Dönünce sipariş verebilirsin.', { reason: 'prayer' });
  }

  const openCount = (
    await db.collection('orders').where('userId', '==', uid).where('status', 'in', OPEN_STATUSES).count().get()
  ).data().count;
  const limit = shop.maxActiveOrders ?? 2;
  if (openCount >= limit) {
    throw new HttpsError('failed-precondition', `Aynı anda en fazla ${limit} açık siparişin olabilir.`, { reason: 'limit' });
  }

  // Ürün, çeşit, fiyat ve adlar SUNUCUDAN okunur; istemciden fiyat kabul edilmez
  const productIds = [...new Set(items.map((i) => i.productId))];
  const productSnaps = await db.getAll(...productIds.map((id) => db.doc(`products/${id}`)));
  const productsById = new Map(productSnaps.map((s) => [s.id, s.exists ? (s.data() as ProductDoc) : null]));

  const orderItems: OrderItem[] = items.map((item) => {
    const product = productsById.get(item.productId);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant) {
      throw new HttpsError('failed-precondition', 'Sepetindeki bir ürün artık menüde yok.', {
        reason: 'unavailable',
        productId: item.productId,
        variantId: item.variantId,
      });
    }
    const displayName = product.variants.length > 1 ? `${product.name}, ${variant.name}` : product.name;
    if (!product.available || !variant.available) {
      throw new HttpsError('failed-precondition', `${displayName} şu an tükendi.`, {
        reason: 'unavailable',
        productId: item.productId,
        variantId: item.variantId,
      });
    }
    return {
      productId: item.productId,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      unitPrice: variant.price,
      qty: item.qty,
      note: item.note,
    };
  });
  const total = orderItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

  const now = Timestamp.now();
  const counterRef = db.doc(`counters/${istanbulDate(now.toDate())}`);

  const orderNo = await db.runTransaction(async (tx) => {
    const [existing, counter] = await Promise.all([tx.get(orderRef), tx.get(counterRef)]);
    if (existing.exists) return (existing.data() as OrderDoc).orderNo;
    const next = ((counter.data()?.lastOrderNo as number | undefined) ?? 0) + 1;
    tx.set(counterRef, { lastOrderNo: next });
    const order: OrderDoc = {
      orderNo: next,
      userId: uid,
      userName: user.name,
      userPhone: user.phone ?? null,
      items: orderItems,
      note: orderNote,
      total,
      status: 'pending',
      queuePos: now.toMillis(),
      etaMinutes: null,
      etaAt: null,
      rejectReason: null,
      cancelledBy: null,
      createdAt: now,
      acceptedAt: null,
      readyAt: null,
      closedAt: null,
      updatedAt: now,
      unreadForUser: 0,
      unreadForAdmin: 0,
      lastMessageAt: null,
      statsApplied: false,
    };
    tx.create(orderRef, order);
    return next;
  });

  return { orderId: orderRef.id, orderNo };
});

// ---------------------------------------------------------------------------
// Tetikleyiciler (PROJE.md 8.4 / 8.5 / 8.6)
// ---------------------------------------------------------------------------

async function safely(label: string, task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (err) {
    logger.error(label, { err });
  }
}

export const onOrderCreated = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data?.data() as OrderDoc | undefined;
  if (!order) return;
  await Promise.all([
    safely('Sıra güncellenemedi (oluşturma)', recomputeQueue),
    safely('Yeni sipariş push hatası', async () =>
      sendPush(await adminRecipients(), {
        title: `Yeni sipariş #${order.orderNo}`,
        body: `${shortName(order.userName)}: ${itemsSummary(order)}`,
        type: 'new_order',
        orderId: event.params.orderId,
        channelId: 'new-orders',
      }),
    ),
  ]);
});

/** Durum geçişlerinin bildirimleri (PROJE.md 5.1). */
async function notifyStatusChange(orderId: string, before: OrderDoc, after: OrderDoc): Promise<void> {
  const toStudent = async (title: string, body: string, type: 'order_status' | 'eta_extended') =>
    sendPush(await userRecipient(after.userId), { title, body, type, orderId, channelId: 'orders' });

  if (before.status !== after.status) {
    switch (after.status) {
      case 'preparing':
        return toStudent(
          'Siparişin hazırlanıyor',
          `Ramazan abi siparişini hazırlıyor, ~${after.etaMinutes ?? '?'} dk.`,
          'order_status',
        );
      case 'ready':
        return toStudent('Siparişin hazır!', 'Kantinden alabilirsin.', 'order_status');
      case 'rejected':
        return toStudent(
          'Siparişin reddedildi',
          after.rejectReason ?? 'Ramazan abi siparişini şu an hazırlayamıyor.',
          'order_status',
        );
      case 'cancelled':
        if (after.cancelledBy !== 'user') return;
        return sendPush(await adminRecipients(), {
          title: `#${after.orderNo} iptal edildi`,
          body: `${shortName(after.userName)} siparişini iptal etti.`,
          type: 'order_cancelled',
          orderId,
          channelId: 'new-orders',
        });
      default:
        return;
    }
  }

  const etaBefore = before.etaAt?.toMillis() ?? 0;
  const etaAfter = after.etaAt?.toMillis() ?? 0;
  if (after.status === 'preparing' && etaAfter > etaBefore) {
    const minutesLeft = Math.max(1, Math.ceil((etaAfter - Date.now()) / 60_000));
    return toStudent('Süre biraz uzadı', `Yeni tahmin ~${minutesLeft} dk.`, 'eta_extended');
  }
}

export const onOrderUpdated = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data?.before.data() as OrderDoc | undefined;
  const after = event.data?.after.data() as OrderDoc | undefined;
  if (!before || !after) return;
  const orderId = event.params.orderId;

  const tasks: Promise<void>[] = [safely('Durum push hatası', () => notifyStatusChange(orderId, before, after))];
  if (before.status !== after.status || before.queuePos !== after.queuePos) {
    tasks.push(safely('Sıra güncellenemedi (güncelleme)', recomputeQueue));
  }
  // statsApplied yazımı bu tetikleyiciyi tekrar çalıştırır; kontrol sonsuz döngüyü engeller
  const afterRef = event.data?.after.ref;
  if (afterRef && isClosed(after.status) && !after.statsApplied) {
    tasks.push(safely('İstatistik işlenemedi', () => applyStats(afterRef)));
  }
  await Promise.all(tasks);
});

export const onMessageCreated = onDocumentCreated('orders/{orderId}/messages/{messageId}', async (event) => {
  const message = event.data?.data() as MessageDoc | undefined;
  if (!message) return;
  const { orderId } = event.params;
  const db = getFirestore();
  const orderRef = db.doc(`orders/${orderId}`);
  const fromStudent = message.senderRole === 'user';

  await orderRef.update({
    lastMessageAt: message.createdAt ?? FieldValue.serverTimestamp(),
    [fromStudent ? 'unreadForAdmin' : 'unreadForUser']: FieldValue.increment(1),
  });

  await safely('Mesaj push hatası', async () => {
    const order = (await orderRef.get()).data() as OrderDoc | undefined;
    if (!order) return;
    if (fromStudent) {
      await sendPush(await adminRecipients(), {
        title: `#${order.orderNo} ${shortName(order.userName)}`,
        body: message.text,
        type: 'message',
        orderId,
        channelId: 'new-orders',
      });
    } else {
      await sendPush(await userRecipient(order.userId), {
        title: 'Ramazan abi',
        body: message.text,
        type: 'message',
        orderId,
        channelId: 'orders',
      });
    }
  });
});
