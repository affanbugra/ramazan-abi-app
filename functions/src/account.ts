// deleteMyAccount (PROJE.md 8.8): Apple'ın uygulama içi hesap silme şartı.
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import type { UserDoc } from './models';

const BATCH_LIMIT = 400;

export const deleteMyAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Önce giriş yapmalısın.');

  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);
  const user = (await userRef.get()).data() as UserDoc | undefined;
  if (user?.role === 'admin') throw new HttpsError('permission-denied', 'Yönetici hesabı uygulamadan silinemez.');

  // Profil fotoğrafları
  try {
    await getStorage().bucket().deleteFiles({ prefix: `avatars/${uid}/` });
  } catch (err) {
    logger.warn('Avatarlar silinemedi', { uid, err });
  }

  // Eski siparişlerde ad ve telefon gizlenir (siparişler raporlar için kalır)
  const orders = await db.collection('orders').where('userId', '==', uid).select().get();
  for (let i = 0; i < orders.docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const d of orders.docs.slice(i, i + BATCH_LIMIT)) {
      batch.update(d.ref, { userName: 'Silinmiş kullanıcı', userPhone: null });
    }
    await batch.commit();
  }

  await userRef.delete();
  await getAuth().deleteUser(uid);
  return { ok: true };
});
