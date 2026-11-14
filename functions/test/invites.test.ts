// registerWithInvite + createInvite uçtan uca testi (emülatörde).
// Çalıştırma (functions/ içinde): npm run test:functions
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { initializeApp as initAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminDb, Timestamp } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { connectFunctionsEmulator, FunctionsError, getFunctions, httpsCallable } from 'firebase/functions';

const PROJECT_ID = 'demo-ramazan-abi';

initAdminApp({ projectId: PROJECT_ID });
const adminDb = getAdminDb();
const adminAuth = getAdminAuth();

const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-key' });
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const functions = getFunctions(app, 'europe-west1');
connectFunctionsEmulator(functions, '127.0.0.1', 5001);

const createInvite = httpsCallable<{ label: string }, { code: string; expiresAt: number }>(functions, 'createInvite');
const register = httpsCallable<Record<string, string>, { ok: boolean }>(functions, 'registerWithInvite');

const ADMIN = { email: 'ramazan@test.com', password: 'kantin123' };
const STUDENT = { email: 'ahmet@test.com', password: 'ogrenci123' };

async function expectError(promise: Promise<unknown>, code: string, messagePart: string, field?: string) {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof FunctionsError, `FunctionsError bekleniyordu: ${String(err)}`);
    assert.equal(err.code, `functions/${code}`);
    assert.match(err.message, new RegExp(messagePart));
    if (field) assert.deepEqual(err.details, { field });
    return true;
  });
}

async function seedInvite(code: string, overrides: Record<string, unknown>) {
  await adminDb.doc(`invites/${code}`).set({
    code,
    label: 'Test',
    status: 'active',
    createdBy: 'x',
    createdByName: 'x',
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 3600_000),
    usedBy: null,
    usedByName: null,
    usedAt: null,
    revokedAt: null,
    ...overrides,
  });
}

function studentInput(code: string, overrides: Record<string, string> = {}) {
  return { code, name: 'Ahmet Yılmaz', phone: '0532 123 45 67', ...STUDENT, ...overrides };
}

let issuedCode = '';

before(async () => {
  const user = await adminAuth.createUser({ ...ADMIN, displayName: 'Ramazan' });
  await adminDb.doc(`users/${user.uid}`).set({ name: 'Ramazan', role: 'admin', status: 'active' });
});

describe('createInvite', () => {
  it('giriş yapmadan kod üretilemez', async () => {
    await expectError(createInvite({ label: 'Ahmet, oda 214' }), 'unauthenticated', 'giriş');
  });

  it('admin 1 saat geçerli kod üretir', async () => {
    await signInWithEmailAndPassword(auth, ADMIN.email, ADMIN.password);
    const { data } = await createInvite({ label: '  Ahmet,   oda 214 ' });
    assert.match(data.code, /^[A-HJ-NP-Z2-9]{6}$/);
    const ttl = data.expiresAt - Date.now();
    assert.ok(ttl > 59 * 60_000 && ttl <= 3600_000, `ttl ${ttl}`);
    const invite = (await adminDb.doc(`invites/${data.code}`).get()).data();
    assert.equal(invite?.label, 'Ahmet, oda 214');
    assert.equal(invite?.createdByName, 'Ramazan');
    issuedCode = data.code;
  });

  it('etiket boşsa hata verir', async () => {
    await expectError(createInvite({ label: ' ' }), 'invalid-argument', 'Kime', 'label');
    await signOut(auth);
  });
});

describe('registerWithInvite', () => {
  it('yanlış kodda Türkçe hata', async () => {
    await expectError(register(studentInput('ZZZZZZ')), 'not-found', 'Kod bulunamadı', 'code');
    await expectError(register(studentInput('AB1')), 'invalid-argument', '6 karakter', 'code');
  });

  it('geçersiz telefon reddedilir', async () => {
    await expectError(register(studentInput(issuedCode, { phone: '0212 123 45 67' })), 'invalid-argument', 'Cep', 'phone');
  });

  it('geçerli kodla öğrenci kaydı olur (küçük harf, boşluk, tire temizlenir)', async () => {
    const messy = `${issuedCode.slice(0, 3).toLowerCase()} -${issuedCode.slice(3)}`;
    const { data } = await register(studentInput(messy));
    assert.deepEqual(data, { ok: true });

    const cred = await signInWithEmailAndPassword(auth, STUDENT.email, STUDENT.password);
    const user = (await adminDb.doc(`users/${cred.user.uid}`).get()).data();
    assert.equal(user?.role, 'student');
    assert.equal(user?.status, 'active');
    assert.equal(user?.phone, '+905321234567');
    assert.equal(user?.inviteCode, issuedCode);
    assert.deepEqual(user?.pushTokens, []);

    const invite = (await adminDb.doc(`invites/${issuedCode}`).get()).data();
    assert.equal(invite?.status, 'used');
    assert.equal(invite?.usedBy, cred.user.uid);
    assert.equal(invite?.usedByName, 'Ahmet Yılmaz');
    await signOut(auth);
  });

  it('aynı kod ikinci kez kullanılamaz', async () => {
    await expectError(
      register(studentInput(issuedCode, { email: 'baska@test.com' })),
      'failed-precondition',
      'daha önce kullanılmış',
      'code',
    );
  });

  it('1 saati geçmiş kod reddedilir', async () => {
    await seedInvite('EXP222', { expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    await expectError(register(studentInput('EXP222', { email: 'exp@test.com' })), 'failed-precondition', 'süresi dolmuş', 'code');
  });

  it('iptal edilen kod reddedilir', async () => {
    await seedInvite('REV333', { status: 'revoked', revokedAt: Timestamp.now() });
    await expectError(register(studentInput('REV333', { email: 'rev@test.com' })), 'failed-precondition', 'iptal', 'code');
  });

  it('kayıtlı e-postada hata verir ve kod tekrar kullanılabilir kalır', async () => {
    await seedInvite('DUP444', {});
    await expectError(register(studentInput('DUP444')), 'already-exists', 'zaten bir hesap', 'email');
    const invite = (await adminDb.doc('invites/DUP444').get()).data();
    assert.equal(invite?.status, 'active');
    assert.equal(invite?.usedAt, null);
  });
});
