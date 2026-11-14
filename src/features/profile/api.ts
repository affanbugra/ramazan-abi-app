import dayjs from 'dayjs';
import { FirebaseError } from 'firebase/app';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { serverTimestamp, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, functions, typedDoc } from '@/lib/firebase';
import { deleteImageByUrl, resizeImage, uploadImage } from '@/lib/images';
import type { OrderDoc, UserDoc } from '@/types/models';

/** Profil kartındaki "kantinde" süresi: createdAt için "12 gün", "2 ay" ya da "1 yıl" */
export function membershipLabel(createdAt: UserDoc['createdAt'] | null | undefined): string | null {
  if (!createdAt) return null;
  const start = dayjs(createdAt.toDate());
  const years = dayjs().diff(start, 'year');
  if (years >= 1) return `${years} yıl`;
  const months = dayjs().diff(start, 'month');
  if (months >= 1) return `${months} ay`;
  return `${Math.max(1, dayjs().diff(start, 'day'))} gün`;
}

/** Teslim edilen siparişlerinden en çok adet alınan ürün; hiç yoksa null (PROJE.md 6.5). */
export function topProductName(orders: Pick<OrderDoc, 'status' | 'items'>[]): string | null {
  const counts = new Map<string, number>();
  for (const o of orders) {
    if (o.status !== 'delivered') continue;
    for (const i of o.items) counts.set(i.productName, (counts.get(i.productName) ?? 0) + i.qty);
  }
  let best: string | null = null;
  let bestQty = 0;
  for (const [name, qty] of counts) {
    if (qty > bestQty) {
      best = name;
      bestQty = qty;
    }
  }
  return best;
}

export async function updateProfile(
  uid: string,
  input: { name: string; phone: string; localPhoto: string | null; removePhoto: boolean; oldPhotoURL: string | null },
) {
  let photoURL = input.removePhoto ? null : input.oldPhotoURL;
  if (input.localPhoto) {
    const resized = await resizeImage(input.localPhoto, 512, 'jpeg');
    photoURL = await uploadImage(resized, `avatars/${uid}/${Date.now()}.jpg`);
  }
  await updateDoc(typedDoc<UserDoc>(`users/${uid}`), {
    name: input.name,
    phone: input.phone,
    photoURL,
    updatedAt: serverTimestamp(),
  });
  if (input.oldPhotoURL && input.oldPhotoURL !== photoURL) await deleteImageByUrl(input.oldPhotoURL);
}

export type PasswordField = 'current' | 'next';

/** Mevcut şifreyle yeniden doğrulayıp şifreyi değiştirir (PROJE.md 6.5). */
export async function changePassword(current: string, next: string): Promise<{ field: PasswordField | 'form'; message: string } | null> {
  const user = auth.currentUser;
  if (!user?.email) return { field: 'form', message: 'Oturum bulunamadı. Çıkış yapıp tekrar gir.' };
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
  } catch (err) {
    const code = err instanceof FirebaseError ? err.code : '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      return { field: 'current', message: 'Mevcut şifren yanlış.' };
    }
    if (code === 'auth/too-many-requests') {
      return { field: 'form', message: 'Çok fazla deneme yaptın. Birkaç dakika bekleyip tekrar dene.' };
    }
    return { field: 'form', message: 'Şifre değiştirilemedi. İnternet bağlantını kontrol et.' };
  }
  try {
    await updatePassword(user, next);
    return null;
  } catch (err) {
    const code = err instanceof FirebaseError ? err.code : '';
    if (code === 'auth/weak-password') return { field: 'next', message: 'Şifre en az 6 karakter olmalı.' };
    return { field: 'form', message: 'Şifre değiştirilemedi. Biraz sonra tekrar dene.' };
  }
}

const deleteAccountCallable = httpsCallable<Record<string, never>, { ok: true }>(functions, 'deleteMyAccount');

export async function deleteMyAccount(): Promise<void> {
  await deleteAccountCallable({});
}
