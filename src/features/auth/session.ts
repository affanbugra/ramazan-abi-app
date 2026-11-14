// Oturum durumu: Firebase Auth + users/{uid} canlı dinleme.
// Kök _layout bu duruma göre (auth) / (student) / (admin) / suspended yönlendirmesi yapar.
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { create } from 'zustand';
import { auth, typedDoc } from '@/lib/firebase';
import type { UserDoc, WithId } from '@/types/models';

export type Session =
  | { status: 'loading' } // uygulama açılışında ilk cevap gelene kadar (splash açık kalır)
  | { status: 'signedOut' }
  | { status: 'signedIn'; profile: WithId<UserDoc> };

export const useSession = create<{ session: Session }>(() => ({
  session: { status: 'loading' },
}));

const setSession = (session: Session) => useSession.setState({ session });

/** Kök layout'ta bir kez çağrılır; dönen fonksiyon dinleyicileri kapatır. */
export function startSessionListener(): Unsubscribe {
  let unsubscribeProfile: Unsubscribe | null = null;

  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    unsubscribeProfile?.();
    unsubscribeProfile = null;

    if (!user) {
      setSession({ status: 'signedOut' });
      return;
    }

    // Profil gelene kadar önceki durum korunur (giriş ekranı yükleniyor halinde kalır)
    unsubscribeProfile = onSnapshot(
      typedDoc<UserDoc>(`users/${user.uid}`),
      (snap) => {
        if (snap.exists()) {
          setSession({ status: 'signedIn', profile: { ...snap.data(), id: snap.id } });
        } else if (!snap.metadata.fromCache) {
          // Profili olmayan Auth hesabı (ör. silinmiş): oturumu kapat
          signOut(auth).catch(() => undefined);
        }
      },
      (err) => {
        console.warn('Profil dinlenemedi', err);
        signOut(auth).catch(() => undefined);
      },
    );
  });

  return () => {
    unsubscribeAuth();
    unsubscribeProfile?.();
  };
}
