// placeOrder + sıra tetikleyicisi uçtan uca testi (emülatörde).
// Çalıştırma (functions/ içinde): npm run test:functions
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { before, describe, it } from 'node:test';
import { initializeApp as initAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminDb, Timestamp } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { connectFunctionsEmulator, FunctionsError, getFunctions, httpsCallable } from 'firebase/functions';
import { addDoc, collection, connectFirestoreEmulator, getFirestore, serverTimestamp } from 'firebase/firestore';

const PROJECT_ID = 'demo-ramazan-abi';
initAdminApp({ projectId: PROJECT_ID });
const adminDb = getAdminDb();
const adminAuth = getAdminAuth();

const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-key' }, 'orders-test');
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const functions = getFunctions(app, 'europe-west1');
connectFunctionsEmulator(functions, '127.0.0.1', 5001);
const clientDb = getFirestore(app);
connectFirestoreEmulator(clientDb, '127.0.0.1', 8080);

interface PlaceOrderResult {
  orderId: string;
  orderNo: number;
}
const placeOrder = httpsCallable<Record<string, unknown>, PlaceOrderResult>(functions, 'placeOrder');

const requestId = () => randomBytes(12).toString('hex');
const STUDENT = { email: 'siparis@test.com', password: 'ogrenci123' };
const SUSPENDED = { email: 'askida@test.com', password: 'ogrenci123' };
let studentUid = '';

async function setShop(patch: Record<string, unknown>) {
  await adminDb.doc('settings/shop').set({ isOpen: true, busyLevel: 'normal', maxActiveOrders: 2, ...patch }, { merge: true });
}

async function expectError(promise: Promise<unknown>, code: string, messagePart: string) {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof FunctionsError, String(err));
    assert.equal(err.code, `functions/${code}`);
    assert.match(err.message, new RegExp(messagePart));
    return true;
  });
}

async function waitFor<T>(read: () => Promise<T>, ok: (v: T) => boolean, ms = 8000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = await read();
    if (ok(value) || Date.now() - start > ms) return value;
    await new Promise((r) => setTimeout(r, 250));
  }
}

before(async () => {
  for (const u of [STUDENT, SUSPENDED]) {
    const user = await adminAuth.createUser(u);
    await adminDb.doc(`users/${user.uid}`).set({
      name: u === STUDENT ? 'Ahmet Yılmaz' : 'Kemal',
      phone: '+905321234567',
      role: 'student',
      status: u === STUDENT ? 'active' : 'suspended',
      // Biçimi geçersiz token: push yardımcısı atlamalı, hiçbir işlem bozulmamalı
      pushTokens: ['gecersiz-token'],
    });
    if (u === STUDENT) studentUid = user.uid;
  }
  await adminDb.doc('products/tost').set({
    name: 'Tost',
    categoryId: 'tostlar',
    order: 1,
    available: true,
    variants: [
      { id: 'kasarli', name: 'Kaşarlı', price: 75, available: true },
      { id: 'sucuklu', name: 'Sucuklu', price: 70, available: false },
    ],
  });
  await adminDb.doc('products/ayran').set({
    name: 'Ayran',
    categoryId: 'diger',
    order: 1,
    available: true,
    variants: [{ id: 'standart', name: 'Standart', price: 20, available: true }],
  });
  await adminDb.doc('products/patso').set({
    name: 'Patso',
    categoryId: 'diger',
    order: 2,
    available: false,
    variants: [{ id: 'standart', name: 'Standart', price: 90, available: true }],
  });
  await setShop({ isOpen: true, maxActiveOrders: 2 });
});

describe('placeOrder', () => {
  it('giriş yapmadan sipariş verilemez', async () => {
    await expectError(placeOrder({ requestId: requestId(), items: [] }), 'unauthenticated', 'giriş');
  });

  it('askıdaki öğrenci sipariş veremez', async () => {
    await signInWithEmailAndPassword(auth, SUSPENDED.email, SUSPENDED.password);
    await expectError(
      placeOrder({ requestId: requestId(), items: [{ productId: 'ayran', variantId: 'standart', qty: 1 }] }),
      'permission-denied',
      'askıya',
    );
    await signOut(auth);
  });

  it('kantin kapalıyken sipariş verilemez', async () => {
    await signInWithEmailAndPassword(auth, STUDENT.email, STUDENT.password);
    await setShop({ isOpen: false });
    await expectError(
      placeOrder({ requestId: requestId(), items: [{ productId: 'ayran', variantId: 'standart', qty: 1 }] }),
      'failed-precondition',
      'Kantin şu an kapalı',
    );
    await setShop({ isOpen: true });
  });

  it('namaz arasında sipariş verilemez', async () => {
    await setShop({ isOpen: true, prayerBreak: true });
    await expectError(
      placeOrder({ requestId: requestId(), items: [{ productId: 'ayran', variantId: 'standart', qty: 1 }] }),
      'failed-precondition',
      'namazda',
    );
    await setShop({ prayerBreak: false });
  });

  it('tükenmiş ürün ve çeşit adıyla reddedilir', async () => {
    await expectError(
      placeOrder({ requestId: requestId(), items: [{ productId: 'tost', variantId: 'sucuklu', qty: 1 }] }),
      'failed-precondition',
      'Tost, Sucuklu şu an tükendi',
    );
    await expectError(
      placeOrder({ requestId: requestId(), items: [{ productId: 'patso', variantId: 'standart', qty: 1 }] }),
      'failed-precondition',
      'Patso şu an tükendi',
    );
  });

  it('geçersiz adet reddedilir', async () => {
    await expectError(
      placeOrder({ requestId: requestId(), items: [{ productId: 'ayran', variantId: 'standart', qty: 11 }] }),
      'invalid-argument',
      'en fazla 10',
    );
  });

  it('fiyat sunucudan gelir, istemcinin gönderdiği fiyat yok sayılır; sipariş no 1', async () => {
    const { data } = await placeOrder({
      requestId: requestId(),
      items: [
        { productId: 'tost', variantId: 'kasarli', qty: 2, note: ' az pişmiş ', unitPrice: 1, total: 1 },
        { productId: 'ayran', variantId: 'standart', qty: 1 },
      ],
      note: 'Hızlı olsun',
      total: 1,
    });
    assert.equal(data.orderNo, 1);
    const order = (await adminDb.doc(`orders/${data.orderId}`).get()).data();
    assert.equal(order?.total, 2 * 75 + 20);
    assert.equal(order?.status, 'pending');
    assert.equal(order?.userId, studentUid);
    assert.equal(order?.userName, 'Ahmet Yılmaz');
    assert.equal(order?.items[0].unitPrice, 75);
    assert.equal(order?.items[0].note, 'az pişmiş');
    assert.equal(order?.items[0].variantName, 'Kaşarlı');
    assert.equal(order?.note, 'Hızlı olsun');
  });

  it('aynı istek iki kez gelirse tek sipariş oluşur', async () => {
    const id = requestId();
    const body = { requestId: id, items: [{ productId: 'ayran', variantId: 'standart', qty: 1 }] };
    const [a, b] = await Promise.allSettled([placeOrder(body), placeOrder(body)]);
    const ok = [a, b].filter((r): r is PromiseFulfilledResult<{ data: PlaceOrderResult }> => r.status === 'fulfilled');
    assert.ok(ok.length >= 1);
    for (const r of ok) assert.equal(r.value.data.orderId, id);
    const mine = await adminDb.collection('orders').where('userId', '==', studentUid).get();
    assert.equal(mine.size, 2, 'ilk sipariş + bu sipariş');
    assert.equal(ok[0].value.data.orderNo, 2, 'sipariş numarası artıyor');
  });

  it('açık sipariş sınırı aşılamaz', async () => {
    await expectError(
      placeOrder({ requestId: requestId(), items: [{ productId: 'ayran', variantId: 'standart', qty: 1 }] }),
      'failed-precondition',
      'en fazla 2 açık',
    );
  });

  it('sıra (queue/current) queuePos sırasıyla güncellenir', async () => {
    const mine = (await adminDb.collection('orders').where('userId', '==', studentUid).orderBy('queuePos').get()).docs.map(
      (d) => d.id,
    );
    const queue = await waitFor(
      async () => ((await adminDb.doc('queue/current').get()).data()?.ids as string[] | undefined) ?? [],
      (ids) => ids.length === mine.length,
    );
    assert.deepEqual(queue, mine);

    // Kantinci ikinci siparişi öne alırsa sıra değişir
    await adminDb.doc(`orders/${mine[1]}`).update({ queuePos: 1 });
    const reordered = await waitFor(
      async () => ((await adminDb.doc('queue/current').get()).data()?.ids as string[] | undefined) ?? [],
      (ids) => ids[0] === mine[1],
    );
    assert.deepEqual(reordered, [mine[1], mine[0]]);

    // İptal edilen sipariş sıradan çıkar
    await adminDb.doc(`orders/${mine[0]}`).update({ status: 'cancelled', cancelledBy: 'user', closedAt: Timestamp.now() });
    const afterCancel = await waitFor(
      async () => ((await adminDb.doc('queue/current').get()).data()?.ids as string[] | undefined) ?? [],
      (ids) => ids.length === 1,
    );
    assert.deepEqual(afterCancel, [mine[1]]);
  });

  it('bir sipariş kapanınca sınır tekrar açılır', async () => {
    const { data } = await placeOrder({
      requestId: requestId(),
      items: [{ productId: 'ayran', variantId: 'standart', qty: 3 }],
    });
    assert.equal(data.orderNo, 3);
    await signOut(auth);
  });

  it('mesaj gelince okunmamış sayacı ve lastMessageAt güncellenir', async () => {
    await setShop({ maxActiveOrders: 5 });
    await signInWithEmailAndPassword(auth, STUDENT.email, STUDENT.password);
    const { data } = await placeOrder({
      requestId: requestId(),
      items: [{ productId: 'ayran', variantId: 'standart', qty: 1 }],
    });
    await addDoc(collection(clientDb, `orders/${data.orderId}/messages`), {
      senderId: studentUid,
      senderRole: 'user',
      text: 'Az pişmiş olsun lütfen',
      createdAt: serverTimestamp(),
    });
    const order = await waitFor(
      async () => (await adminDb.doc(`orders/${data.orderId}`).get()).data(),
      (o) => (o?.unreadForAdmin ?? 0) === 1,
    );
    assert.equal(order?.unreadForAdmin, 1);
    assert.equal(order?.unreadForUser, 0);
    assert.ok(order?.lastMessageAt, 'lastMessageAt yazıldı');

    // Kantinci cevap verince öğrencinin sayacı artar
    await adminDb.collection(`orders/${data.orderId}/messages`).add({
      senderId: 'admin1',
      senderRole: 'admin',
      text: 'Tamam',
      createdAt: Timestamp.now(),
    });
    const after = await waitFor(
      async () => (await adminDb.doc(`orders/${data.orderId}`).get()).data(),
      (o) => (o?.unreadForUser ?? 0) === 1,
    );
    assert.equal(after?.unreadForUser, 1);
    await signOut(auth);
  });
});
