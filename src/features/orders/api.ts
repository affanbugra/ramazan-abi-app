import { limit, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { FunctionsError, httpsCallable } from 'firebase/functions';
import { functions, typedCollection, typedDoc } from '@/lib/firebase';
import { useLiveCollection, useLiveDocument } from '@/lib/useFirestore';
import type { CartLine, NewCartLine } from '@/features/cart/store';
import type { OrderDoc, OrderStatus, ProductDoc, QueueDoc, WithId } from '@/types/models';

export const OPEN_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready'];

export function isOpenOrder(order: Pick<OrderDoc, 'status'>): boolean {
  return OPEN_STATUSES.includes(order.status);
}

// --- Okuma ---

/** Öğrencinin son 50 siparişi (kurallar gereği userId filtresi şart, PROJE.md 10.1). */
export function useMyOrders(uid: string | null) {
  return useLiveCollection(uid ? `my-orders-${uid}` : null, () =>
    query(typedCollection<OrderDoc>('orders'), where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(50)),
  );
}

export function useOrder(orderId: string | null) {
  return useLiveDocument(orderId ? typedDoc<OrderDoc>(`orders/${orderId}`) : null);
}

export function useQueue() {
  return useLiveDocument(typedDoc<QueueDoc>('queue/current'));
}

// --- Sipariş verme ---

/** Aynı sepetin tekrar gönderilmesinde aynı kimlik kullanılır; sunucu ikinci siparişi oluşturmaz. */
export function newRequestId(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = Date.now().toString(36);
  while (id.length < 24) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return id;
}

interface PlaceOrderInput {
  requestId: string;
  items: { productId: string; variantId: string; qty: number; note: string | null }[];
  note: string | null;
}

const placeOrderCallable = httpsCallable<PlaceOrderInput, { orderId: string; orderNo: number }>(functions, 'placeOrder');

export type PlaceOrderError =
  | { kind: 'unavailable'; message: string; productId: string; variantId: string }
  | { kind: 'other'; message: string };

export async function placeOrder(
  requestId: string,
  lines: CartLine[],
  note: string,
): Promise<{ ok: true; orderId: string; orderNo: number } | { ok: false; error: PlaceOrderError }> {
  try {
    const { data } = await placeOrderCallable({
      requestId,
      items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty, note: l.note })),
      note: note.trim() || null,
    });
    return { ok: true, ...data };
  } catch (err) {
    if (err instanceof FunctionsError) {
      if (err.code === 'functions/unavailable' || err.code === 'functions/deadline-exceeded') {
        return { ok: false, error: { kind: 'other', message: 'İnternet bağlantını kontrol edip tekrar dene.' } };
      }
      const details: unknown = err.details;
      if (
        typeof details === 'object' &&
        details !== null &&
        'reason' in details &&
        details.reason === 'unavailable' &&
        'productId' in details &&
        'variantId' in details &&
        typeof details.productId === 'string' &&
        typeof details.variantId === 'string'
      ) {
        return {
          ok: false,
          error: { kind: 'unavailable', message: err.message, productId: details.productId, variantId: details.variantId },
        };
      }
      if (err.code !== 'functions/internal') return { ok: false, error: { kind: 'other', message: err.message } };
    }
    return { ok: false, error: { kind: 'other', message: 'Sipariş verilemedi. Biraz sonra tekrar dene.' } };
  }
}

/** Öğrenci sadece bekleyen siparişini iptal edebilir (kurallar da zorlar). */
export function cancelOrder(orderId: string) {
  return updateDoc(typedDoc<OrderDoc>(`orders/${orderId}`), {
    status: 'cancelled',
    cancelledBy: 'user',
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** "Tekrar sipariş ver": hâlâ menüde ve müsait olan kalemleri güncel fiyatla sepete hazırlar. */
export function linesForReorder(
  order: OrderDoc,
  products: WithId<ProductDoc>[],
): { lines: NewCartLine[]; skipped: number } {
  const lines: NewCartLine[] = [];
  let skipped = 0;
  for (const item of order.items) {
    const product = products.find((p) => p.id === item.productId);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant || !product.available || !variant.available) {
      skipped++;
      continue;
    }
    lines.push({
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      singleVariant: product.variants.length === 1,
      unitPrice: variant.price,
      qty: item.qty,
      note: item.note,
    });
  }
  return { lines, skipped };
}
