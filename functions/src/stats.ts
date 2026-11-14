// Kapanan siparişin günlük istatistiğe işlenmesi (PROJE.md 8.5).
import { FieldValue, getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import type { OrderDoc } from './models';
import { istanbulDate, istanbulHour } from './time';

const CLOSED = new Set(['delivered', 'no_show', 'cancelled', 'rejected']);

export function isClosed(status: string): boolean {
  return CLOSED.has(status);
}

/**
 * Transaction içinde: sipariş hâlâ işlenmemişse dailyStats + kullanıcı sayaçları güncellenir ve
 * statsApplied=true yazılır. Tetikleyici iki kez çalışsa bile istatistik bir kez sayılır.
 */
export async function applyStats(orderRef: DocumentReference): Promise<void> {
  const db = getFirestore();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    const order = snap.data() as OrderDoc | undefined;
    if (!order || order.statsApplied || !isClosed(order.status)) return;

    const created = order.createdAt.toDate();
    const date = istanbulDate(created);
    const statsRef = db.doc(`dailyStats/${date}`);
    const userRef = db.doc(`users/${order.userId}`);
    const userSnap = await tx.get(userRef);

    // İç içe obje + increment: ürün id'lerinde tire olduğu için noktalı alan yolu kullanılmaz
    const update: Record<string, unknown> = { date };
    if (order.status === 'delivered') {
      update.delivered = FieldValue.increment(1);
      update.revenue = FieldValue.increment(order.total);
      if (order.acceptedAt && order.readyAt) {
        const minutes = (order.readyAt.toMillis() - order.acceptedAt.toMillis()) / 60_000;
        update.prepMinutesSum = FieldValue.increment(Math.max(0, Math.round(minutes * 10) / 10));
        update.prepCount = FieldValue.increment(1);
      }
      const byProduct: Record<string, { name: string; qty: FieldValue; revenue: FieldValue }> = {};
      for (const item of order.items) {
        const existing = byProduct[item.productId];
        // Aynı ürün birden fazla satırdaysa (farklı çeşit/not) toplamlar birleştirilir
        const qty = order.items.filter((i) => i.productId === item.productId).reduce((s, i) => s + i.qty, 0);
        const revenue = order.items
          .filter((i) => i.productId === item.productId)
          .reduce((s, i) => s + i.qty * i.unitPrice, 0);
        if (!existing) {
          byProduct[item.productId] = {
            name: item.productName,
            qty: FieldValue.increment(qty),
            revenue: FieldValue.increment(revenue),
          };
        }
      }
      update.byProduct = byProduct;
      update.byHour = { [istanbulHour(created)]: FieldValue.increment(1) };
      if (userSnap.exists) tx.update(userRef, { orderCount: FieldValue.increment(1) });
    } else if (order.status === 'no_show') {
      update.noShow = FieldValue.increment(1);
      if (userSnap.exists) tx.update(userRef, { noShowCount: FieldValue.increment(1) });
    } else if (order.status === 'cancelled') {
      update.cancelled = FieldValue.increment(1);
    } else if (order.status === 'rejected') {
      update.rejected = FieldValue.increment(1);
    }

    tx.set(statsRef, update, { merge: true });
    tx.update(orderRef, { statsApplied: true });
  });
}
