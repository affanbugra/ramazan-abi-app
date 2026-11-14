import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { QUEUE_STATUSES } from './models';

/** Bekleyen + hazırlanan siparişlerin id'lerini queuePos sırasıyla queue/current'a yazar (PROJE.md 8.7). */
export async function recomputeQueue(): Promise<void> {
  const db = getFirestore();
  const snap = await db
    .collection('orders')
    .where('status', 'in', QUEUE_STATUSES)
    .orderBy('queuePos', 'asc')
    .select()
    .get();
  await db.doc('queue/current').set({ ids: snap.docs.map((d) => d.id), updatedAt: FieldValue.serverTimestamp() });
}
