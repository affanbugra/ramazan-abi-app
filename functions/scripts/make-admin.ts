// Kullanım (functions/ içinde):
//   npm run make-admin -- --email ramazan@ornek.com --password gizli123 --name "Ramazan Yılmaz" --phone "0532 123 45 67"
// Auth kullanıcısını oluşturur (varsa bulur), users/{uid}'yi role:'admin', status:'active' yazar.
import { parseArgs } from 'node:util';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from './init-admin';
import { isValidEmail, isValidName, normalizeEmail, normalizeName, normalizePhone } from '../src/validation';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      password: { type: 'string' },
      name: { type: 'string' },
      phone: { type: 'string' },
    },
  });

  const email = normalizeEmail(values.email ?? '');
  const name = normalizeName(values.name ?? '');
  const phone = normalizePhone(values.phone ?? '');
  const password = values.password ?? '';

  const problems: string[] = [];
  if (!isValidEmail(email)) problems.push('--email geçerli bir e-posta olmalı');
  if (!isValidName(name)) problems.push('--name 2-40 karakter olmalı');
  if (!phone) problems.push('--phone Türkiye cep numarası olmalı (0532 123 45 67)');
  if (password.length < 6) problems.push('--password en az 6 karakter olmalı');
  if (problems.length > 0 || !phone) {
    console.error(problems.join('\n'));
    process.exit(1);
  }

  initAdmin();
  const auth = getAuth();
  const db = getFirestore();

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { password, displayName: name });
    console.log(`Auth kullanıcısı zaten vardı, şifre ve ad güncellendi: ${uid}`);
  } catch (err) {
    if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
    const created = await auth.createUser({ email, password, displayName: name });
    uid = created.uid;
    console.log(`Auth kullanıcısı oluşturuldu: ${uid}`);
  }

  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  const now = FieldValue.serverTimestamp();
  if (snap.exists) {
    // pushTokens, sayaçlar ve createdAt korunur
    await userRef.update({ name, email, phone, role: 'admin', status: 'active', updatedAt: now });
  } else {
    await userRef.set({
      name,
      email,
      phone,
      photoURL: null,
      role: 'admin',
      status: 'active',
      inviteCode: null,
      pushTokens: [],
      orderCount: 0,
      noShowCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`${name} artık yönetici (users/${uid}).`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
