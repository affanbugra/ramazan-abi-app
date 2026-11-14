import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { FunctionsError, httpsCallable } from 'firebase/functions';
import { auth, functions } from '@/lib/firebase';
import { unregisterPushToken } from '@/lib/notifications';

/** Hatanın hangi form alanının altında gösterileceği; 'form' = genel hata. */
export interface FieldError<F extends string> {
  field: F | 'form';
  message: string;
}

const NETWORK_MESSAGE = 'İnternet bağlantını kontrol edip tekrar dene.';
const GENERIC_MESSAGE = 'Bir şeyler ters gitti. Biraz sonra tekrar dene.';

/** Callable fonksiyonların Türkçe hatasını ve (varsa) alan adını çıkarır. */
export function callableError<F extends string>(err: unknown, fields: readonly F[]): FieldError<F> {
  if (err instanceof FunctionsError) {
    if (err.code === 'functions/unavailable' || err.code === 'functions/deadline-exceeded') {
      return { field: 'form', message: NETWORK_MESSAGE };
    }
    const details: unknown = err.details;
    const field =
      typeof details === 'object' && details !== null && 'field' in details && typeof details.field === 'string'
        ? details.field
        : null;
    const knownField = fields.find((f) => f === field);
    // Sunucu mesajları zaten Türkçe; "internal" gibi kodlarda SDK İngilizce mesaj koyar
    const message = err.code === 'functions/internal' && err.message === 'internal' ? GENERIC_MESSAGE : err.message;
    return { field: knownField ?? 'form', message };
  }
  return { field: 'form', message: GENERIC_MESSAGE };
}

type AuthField = 'email' | 'password';

function authError(err: unknown): FieldError<AuthField> {
  const code = err instanceof FirebaseError ? err.code : '';
  switch (code) {
    case 'auth/invalid-email':
      return { field: 'email', message: 'E-posta adresini kontrol et.' };
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return { field: 'password', message: 'E-posta veya şifre yanlış.' };
    case 'auth/user-disabled':
      return { field: 'form', message: 'Bu hesap kapatılmış. Ramazan abiyle konuşabilirsin.' };
    case 'auth/too-many-requests':
      return { field: 'form', message: 'Çok fazla deneme yaptın. Birkaç dakika bekleyip tekrar dene.' };
    case 'auth/network-request-failed':
      return { field: 'form', message: NETWORK_MESSAGE };
    default:
      return { field: 'form', message: GENERIC_MESSAGE };
  }
}

export async function signIn(email: string, password: string): Promise<FieldError<AuthField> | null> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return null;
  } catch (err) {
    return authError(err);
  }
}

export async function sendPasswordReset(email: string): Promise<FieldError<'email'> | null> {
  try {
    await sendPasswordResetEmail(auth, email);
    return null;
  } catch (err) {
    const { field, message } = authError(err);
    // Hesap var/yok bilgisini sızdırmamak için "bulunamadı" hatası da başarı sayılır
    if (err instanceof FirebaseError && err.code === 'auth/user-not-found') return null;
    return { field: field === 'password' ? 'form' : field, message };
  }
}

export const REGISTER_FIELDS = ['code', 'name', 'phone', 'email', 'password'] as const;
export type RegisterField = (typeof REGISTER_FIELDS)[number];
export type RegisterInput = Record<RegisterField, string>;

const registerCallable = httpsCallable<RegisterInput, { ok: true }>(functions, 'registerWithInvite');

export async function registerWithInvite(input: RegisterInput): Promise<FieldError<RegisterField> | null> {
  try {
    await registerCallable(input);
  } catch (err) {
    return callableError(err, REGISTER_FIELDS);
  }
  const loginError = await signIn(input.email, input.password);
  if (loginError) {
    return { field: 'form', message: 'Hesabın oluştu ama giriş yapılamadı. Giriş ekranından dene.' };
  }
  return null;
}

/** Önce bu cihazın push token'ı silinir; çıkış yapan cihaza bildirim gitmesin (PROJE.md 9). */
export async function signOut(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (uid) await unregisterPushToken(uid);
  await firebaseSignOut(auth);
}
