// Kantincinin sipariş durum geçişleri (PROJE.md 5.1). Kurallar: admin siparişi güncelleyebilir.
import { orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { typedCollection, typedDoc } from '@/lib/firebase';
import { useLiveCollection } from '@/lib/useFirestore';
import type { OrderDoc, OrderStatus, WithId } from '@/types/models';

const BOARD_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready'];
const CLOSED_STATUSES: OrderStatus[] = ['delivered', 'no_show', 'cancelled', 'rejected'];

export const ETA_CHOICES = [5, 10, 15, 20, 30] as const;
export const REJECT_REASONS = ['Malzeme bitti', 'Kantin kapanıyor', 'Çok yoğunuz, sonra tekrar dene'] as const;
export const READY_WAIT_WARN_MIN = 45;

const orderRef = (id: string) => typedDoc<OrderDoc>(`orders/${id}`);

/** Panodaki açık siparişler, queuePos sırasıyla. */
export function useBoardOrders() {
  return useLiveCollection('admin-board', () =>
    query(typedCollection<OrderDoc>('orders'), where('status', 'in', BOARD_STATUSES), orderBy('queuePos', 'asc')),
  );
}

/** Europe/Istanbul gece yarısı (cihaz saati İstanbul'da varsayılır). */
function startOfToday(): Timestamp {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

export function useClosedToday() {
  const today = startOfToday();
  return useLiveCollection(`admin-closed-${today.toMillis()}`, () =>
    query(
      typedCollection<OrderDoc>('orders'),
      where('status', 'in', CLOSED_STATUSES),
      where('closedAt', '>=', today),
      orderBy('closedAt', 'desc'),
    ),
  );
}

export function acceptOrder(id: string, minutes: number) {
  const now = Date.now();
  return updateDoc(orderRef(id), {
    status: 'preparing',
    etaMinutes: minutes,
    etaAt: Timestamp.fromMillis(now + minutes * 60_000),
    acceptedAt: Timestamp.fromMillis(now),
    updatedAt: serverTimestamp(),
  });
}

export function extendEta(order: WithId<OrderDoc>, minutes = 5) {
  const base = order.etaAt?.toMillis() ?? Date.now();
  return updateDoc(orderRef(order.id), {
    etaAt: Timestamp.fromMillis(base + minutes * 60_000),
    etaMinutes: (order.etaMinutes ?? 0) + minutes,
    updatedAt: serverTimestamp(),
  });
}

export function markReady(id: string) {
  return updateDoc(orderRef(id), { status: 'ready', readyAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function markDelivered(id: string) {
  return updateDoc(orderRef(id), { status: 'delivered', closedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function markNoShow(id: string) {
  return updateDoc(orderRef(id), { status: 'no_show', closedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function rejectOrder(id: string, reason: string) {
  return updateDoc(orderRef(id), {
    status: 'rejected',
    rejectReason: reason,
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
