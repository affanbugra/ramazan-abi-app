import { query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { typedCollection, typedDoc } from '@/lib/firebase';
import { useLiveCollection } from '@/lib/useFirestore';
import type { UserDoc, UserStatus } from '@/types/models';

/** Tüm öğrenciler (~200; sıralama istemcide, ek indeks gerekmesin). */
export function useStudents() {
  return useLiveCollection('students', () => query(typedCollection<UserDoc>('users'), where('role', '==', 'student')));
}

/** Kurallar: admin başka kullanıcının yalnızca status alanını active/suspended yapabilir. */
export function setUserStatus(uid: string, status: UserStatus) {
  return updateDoc(typedDoc<UserDoc>(`users/${uid}`), { status, updatedAt: serverTimestamp() });
}
