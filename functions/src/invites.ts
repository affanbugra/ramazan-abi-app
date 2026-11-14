import { randomInt } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall, type FunctionsErrorCode } from 'firebase-functions/https';
import type { InviteDoc, UserDoc } from './models';
import {
  INVITE_ALPHABET,
  isValidEmail,
  isValidInviteCode,
  isValidName,
  normalizeEmail,
  normalizeInviteCode,
  normalizeName,
  normalizePhone,
} from './validation';

const INVITE_TTL_MS = 60 * 60 * 1000;
const GRPC_ALREADY_EXISTS = 6;

type RegisterField = 'code' | 'name' | 'phone' | 'email' | 'password';

// İstemci hatayı ilgili alanın altında gösterebilsin diye alan adı details'e konur
function fieldError(code: FunctionsErrorCode, message: string, field: RegisterField | 'label'): HttpsError {
  return new HttpsError(code, message, { field });
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function errorCode(err: unknown): string | number | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const { code } = err;
    if (typeof code === 'string' || typeof code === 'number') return code;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// registerWithInvite (PROJE.md 8.1) — auth gerekmez
// ---------------------------------------------------------------------------

interface RegisterInput {
  code?: unknown;
  email?: unknown;
  password?: unknown;
  name?: unknown;
  phone?: unknown;
}

export const registerWithInvite = onCall<RegisterInput>(async (request) => {
  const input = request.data ?? {};
  const code = normalizeInviteCode(asString(input.code));
  const name = normalizeName(asString(input.name));
  const phone = normalizePhone(asString(input.phone));
  const email = normalizeEmail(asString(input.email));
  const password = asString(input.password);

  if (!isValidInviteCode(code)) {
    throw fieldError('invalid-argument', 'Kod 6 karakter olmalı. Ramazan abiden aldığın kodu kontrol et.', 'code');
  }
  if (!isValidName(name)) {
    throw fieldError('invalid-argument', 'Adını ve soyadını yaz (2-40 karakter).', 'name');
  }
  if (!phone) {
    throw fieldError('invalid-argument', 'Cep telefonu numaranı 0532 123 45 67 gibi yaz.', 'phone');
  }
  if (!isValidEmail(email)) {
    throw fieldError('invalid-argument', 'E-posta adresini kontrol et.', 'email');
  }
  if (password.length < 6) {
    throw fieldError('invalid-argument', 'Şifre en az 6 karakter olmalı.', 'password');
  }

  const db = getFirestore();
  const inviteRef = db.doc(`invites/${code}`);

  // 1) Kodu rezerve et: aynı kodla aynı anda iki kayıt olamasın
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(inviteRef);
    if (!snap.exists) {
      throw fieldError('not-found', 'Kod bulunamadı.', 'code');
    }
    const invite = snap.data() as InviteDoc;
    if (invite.status === 'used') {
      throw fieldError('failed-precondition', 'Bu kod daha önce kullanılmış.', 'code');
    }
    if (invite.status === 'revoked') {
      throw fieldError('failed-precondition', 'Bu kod iptal edilmiş. Ramazan abiden yeni kod iste.', 'code');
    }
    if (invite.expiresAt.toMillis() < Date.now()) {
      throw fieldError('failed-precondition', 'Bu kodun süresi dolmuş. Ramazan abiden yeni kod iste.', 'code');
    }
    tx.update(inviteRef, { status: 'used', usedAt: FieldValue.serverTimestamp() });
  });

  const releaseInvite = () =>
    inviteRef.update({ status: 'active', usedAt: null }).catch((err: unknown) => {
      logger.error('Davet kodu geri açılamadı', { code, err });
    });

  // 2) Auth kullanıcısı
  let uid: string;
  try {
    const user = await getAuth().createUser({ email, password, displayName: name });
    uid = user.uid;
  } catch (err) {
    await releaseInvite();
    switch (errorCode(err)) {
      case 'auth/email-already-exists':
        throw fieldError('already-exists', 'Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.', 'email');
      case 'auth/invalid-email':
        throw fieldError('invalid-argument', 'E-posta adresini kontrol et.', 'email');
      case 'auth/invalid-password':
        throw fieldError('invalid-argument', 'Şifre en az 6 karakter olmalı.', 'password');
      default:
        logger.error('createUser başarısız', { err });
        throw new HttpsError('internal', 'Kayıt şu an yapılamadı. Biraz sonra tekrar dene.');
    }
  }

  // 3) Profil + davetin kime gittiği
  try {
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.create(db.doc(`users/${uid}`), {
      name,
      email,
      phone,
      photoURL: null,
      role: 'student',
      status: 'active',
      inviteCode: code,
      pushTokens: [],
      orderCount: 0,
      noShowCount: 0,
      createdAt: now,
      updatedAt: now,
    } satisfies Record<keyof UserDoc, unknown>);
    batch.update(inviteRef, { usedBy: uid, usedByName: name });
    await batch.commit();
  } catch (err) {
    logger.error('Kullanıcı profili yazılamadı, kayıt geri alınıyor', { uid, err });
    await getAuth().deleteUser(uid).catch(() => undefined);
    await releaseInvite();
    throw new HttpsError('internal', 'Kayıt şu an yapılamadı. Biraz sonra tekrar dene.');
  }

  return { ok: true };
});

// ---------------------------------------------------------------------------
// createInvite (PROJE.md 8.2) — sadece admin
// ---------------------------------------------------------------------------

interface CreateInviteInput {
  label?: unknown;
}

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  return code;
}

export const createInvite = onCall<CreateInviteInput>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Önce giriş yapmalısın.');
  }

  const db = getFirestore();
  const meSnap = await db.doc(`users/${uid}`).get();
  const me = meSnap.data() as UserDoc | undefined;
  if (!me || me.role !== 'admin' || me.status !== 'active') {
    throw new HttpsError('permission-denied', 'Bu işlem için yetkin yok.');
  }

  const label = normalizeName(asString(request.data?.label));
  if (!isValidName(label)) {
    throw fieldError('invalid-argument', 'Kime verdiğini 2-40 karakterle yaz.', 'label');
  }

  const createdAt = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(createdAt.toMillis() + INVITE_TTL_MS);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const invite: InviteDoc = {
      code,
      label,
      status: 'active',
      createdBy: uid,
      createdByName: me.name,
      createdAt,
      expiresAt,
      usedBy: null,
      usedByName: null,
      usedAt: null,
      revokedAt: null,
    };
    try {
      // create(): doküman varsa hata verir, böylece aynı kod iki kez üretilmez
      await db.doc(`invites/${code}`).create(invite);
      return { code, expiresAt: expiresAt.toMillis() };
    } catch (err) {
      if (errorCode(err) === GRPC_ALREADY_EXISTS) continue;
      throw err;
    }
  }

  throw new HttpsError('internal', 'Kod üretilemedi. Tekrar dene.');
});
