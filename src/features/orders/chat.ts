import { addDoc, limit, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { typedCollection, typedDoc } from '@/lib/firebase';
import { useLiveCollection } from '@/lib/useFirestore';
import type { MessageDoc, OrderDoc } from '@/types/models';

export const MESSAGE_MAX = 500;

export function useMessages(orderId: string) {
  return useLiveCollection(`messages-${orderId}`, () =>
    query(typedCollection<MessageDoc>(`orders/${orderId}/messages`), orderBy('createdAt', 'asc'), limit(200)),
  );
}

export function sendMessage(orderId: string, senderId: string, senderRole: 'user' | 'admin', text: string) {
  return addDoc(typedCollection<MessageDoc>(`orders/${orderId}/messages`), {
    senderId,
    senderRole,
    text,
    // Kural createdAt == request.time ister
    createdAt: serverTimestamp(),
  });
}

/** Ekran açıkken okunmamış sayacı sıfırlanır (öğrenci için kural yalnızca bu alanı izin verir). */
export function clearUnread(orderId: string, side: 'user' | 'admin') {
  return updateDoc(typedDoc<OrderDoc>(`orders/${orderId}`), side === 'user' ? { unreadForUser: 0 } : { unreadForAdmin: 0 });
}
