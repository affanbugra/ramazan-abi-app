// İstatistik tetikleyicisi + deleteMyAccount testi (emülatörde).
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeApp as initAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminDb, Timestamp } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { connectFunctionsEmulator, FunctionsError, getFunctions, httpsCallable } from 'firebase/functions';
import { istanbulDate, istanbulHour } from '../src/time';

const PROJECT_ID = 'demo-ramazan-abi';
initAdminApp({ projectId: PROJECT_ID });
const adminDb = getAdminDb();
const adminAuth = getAdminAuth();

const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-key' }, 'stats-test');
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const functions = getFunctions(app, 'europe-west1');
connectFunctionsEmulator(functions, '127.0.0.1', 5001);
const deleteMyAccount = httpsCallable(functions, 'deleteMyAccount');

const STUDENT = { email: 'istatistik@test.com', password: 'ogrenci123' };
const ADMIN = { email: 'istatistik-admin@test.com', password: 'kantin123' };
let uid = '';
const created = Timestamp.fromDate(new Date('2026-01-15T09:15:00Z')); // İstanbul 12:15; diğer testlerin günüyle karışmasın
const date = istanbulDate(created.toDate());

async function waitFor<T>(read: () => Promise<T>, ok: (v: T) => boolean, ms = 8000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = await read();
    if (ok(value) || Date.now() - start > ms) return value;
    await new Promise((r) => setTimeout(r, 250));
  }
}

const stats = () => adminDb.doc(`dailyStats/${date}`).get().then((s) => s.data());

async function makeOrder(id: string, items: { productId: string; productName: string; variantName: string; unitPrice: number; qty: number }[]) {
  await adminDb.doc(`orders/${id}`).set({
    orderNo: 1,
    userId: uid,
    userName: 'İstatistik Öğrenci',
    userPhone: '+905321234567',
    items: items.map((i) => ({ ...i, variantId: i.variantName.toLowerCase(), note: null })),
    note: null,
    total: items.reduce((s, i) => s + i.unitPrice * i.qty, 0),
    status: 'pending',
    queuePos: Date.now(),
    createdAt: created,
    acceptedAt: null,
    readyAt: null,
    closedAt: null,
    statsApplied: false,
    unreadForUser: 0,
    unreadForAdmin: 0,
  });
}

before(async () => {
  const student = await adminAuth.createUser(STUDENT);
  uid = student.uid;
  await adminDb.doc(`users/${uid}`).set({ name: 'İstatistik Öğrenci', role: 'student', status: 'active', orderCount: 0, noShowCount: 0 });
  const admin = await adminAuth.createUser(ADMIN);
  await adminDb.doc(`users/${admin.uid}`).set({ name: 'Ramazan', role: 'admin', status: 'active' });
});

describe('günlük istatistik', () => {
  it('teslim edilen sipariş ciro, ürün, saat, hazırlama süresi ve kullanıcı sayacına işlenir', async () => {
    await makeOrder('stat-1', [
      { productId: 'tost', productName: 'Tost', variantName: 'Kaşarlı', unitPrice: 75, qty: 2 },
      { productId: 'tost', productName: 'Tost', variantName: 'Sucuklu', unitPrice: 70, qty: 1 },
      { productId: 'cig-kofte-durum', productName: 'Çiğ köfte dürüm', variantName: 'Standart', unitPrice: 60, qty: 1 },
    ]);
    await adminDb.doc('orders/stat-1').update({
      status: 'delivered',
      acceptedAt: Timestamp.fromMillis(created.toMillis() + 60_000),
      readyAt: Timestamp.fromMillis(created.toMillis() + 13 * 60_000),
      closedAt: Timestamp.now(),
    });
    const s = await waitFor(stats, (v) => v?.delivered === 1);
    assert.equal(s?.date, date);
    assert.equal(s?.delivered, 1);
    assert.equal(s?.revenue, 2 * 75 + 70 + 60);
    assert.equal(s?.prepCount, 1);
    assert.equal(s?.prepMinutesSum, 12);
    assert.deepEqual(s?.byProduct?.tost, { name: 'Tost', qty: 3, revenue: 220 });
    assert.deepEqual(s?.byProduct?.['cig-kofte-durum'], { name: 'Çiğ köfte dürüm', qty: 1, revenue: 60 });
    assert.equal(s?.byHour?.[istanbulHour(created.toDate())], 1);
    assert.equal(istanbulHour(created.toDate()), '12');

    const order = await waitFor(
      async () => (await adminDb.doc('orders/stat-1').get()).data(),
      (o) => o?.statsApplied === true,
    );
    assert.equal(order?.statsApplied, true);
    assert.equal((await adminDb.doc(`users/${uid}`).get()).data()?.orderCount, 1);
  });

  it('aynı sipariş ikinci kez sayılmaz', async () => {
    await adminDb.doc('orders/stat-1').update({ unreadForAdmin: 0, statsApplied: true });
    await new Promise((r) => setTimeout(r, 1500));
    const s = await stats();
    assert.equal(s?.delivered, 1);
    assert.equal(s?.revenue, 280);
  });

  it('gelmedi, iptal ve red sayılır; gelmedi kullanıcı sayacına işlenir', async () => {
    await makeOrder('stat-2', [{ productId: 'ayran', productName: 'Ayran', variantName: 'Standart', unitPrice: 20, qty: 1 }]);
    await makeOrder('stat-3', [{ productId: 'ayran', productName: 'Ayran', variantName: 'Standart', unitPrice: 20, qty: 1 }]);
    await makeOrder('stat-4', [{ productId: 'ayran', productName: 'Ayran', variantName: 'Standart', unitPrice: 20, qty: 1 }]);
    await adminDb.doc('orders/stat-2').update({ status: 'no_show', closedAt: Timestamp.now() });
    await adminDb.doc('orders/stat-3').update({ status: 'cancelled', cancelledBy: 'user', closedAt: Timestamp.now() });
    await adminDb.doc('orders/stat-4').update({ status: 'rejected', rejectReason: 'Malzeme bitti', closedAt: Timestamp.now() });
    const s = await waitFor(stats, (v) => v?.noShow === 1 && v?.cancelled === 1 && v?.rejected === 1);
    assert.equal(s?.noShow, 1);
    assert.equal(s?.cancelled, 1);
    assert.equal(s?.rejected, 1);
    assert.equal(s?.revenue, 280, 'kapanan ama teslim edilmeyen siparişler ciroya eklenmez');
    const user = await waitFor(
      async () => (await adminDb.doc(`users/${uid}`).get()).data(),
      (u) => u?.noShowCount === 1,
    );
    assert.equal(user?.noShowCount, 1);
  });
});

describe('deleteMyAccount', () => {
  it('admin hesabı uygulamadan silinemez', async () => {
    await signInWithEmailAndPassword(auth, ADMIN.email, ADMIN.password);
    await assert.rejects(deleteMyAccount({}), (err: unknown) => {
      assert.ok(err instanceof FunctionsError);
      assert.equal(err.code, 'functions/permission-denied');
      return true;
    });
    await signOut(auth);
  });

  it('öğrenci hesabı silinir, siparişlerde "Silinmiş kullanıcı" kalır', async () => {
    await signInWithEmailAndPassword(auth, STUDENT.email, STUDENT.password);
    await deleteMyAccount({});
    assert.equal((await adminDb.doc(`users/${uid}`).get()).exists, false);
    await assert.rejects(adminAuth.getUser(uid));
    const order = (await adminDb.doc('orders/stat-1').get()).data();
    assert.equal(order?.userName, 'Silinmiş kullanıcı');
    assert.equal(order?.userPhone, null);
    await assert.rejects(signInWithEmailAndPassword(auth, STUDENT.email, STUDENT.password));
  });
});
