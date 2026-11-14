// Tek seferlik: stockItems'ı eski yapıdan (unit/quantity/max/threshold/step) yeni yapıya (level/group) taşır.
// Kullanım (functions/ içinde): npm run build && node lib/scripts/migrate-stock.js
// Tekrar çalıştırılabilir: yeni yapıdaki dokümana dokunmaz.
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from './init-admin';
import { seedStockGroup } from '../src/stockGroups';

async function main(): Promise<void> {
  initAdmin();
  const db = getFirestore();
  const snap = await db.collection('stockItems').get();
  let moved = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (typeof data.level === 'number' && typeof data.group === 'string' && data.max === undefined) continue;
    const max = typeof data.max === 'number' && data.max > 0 ? data.max : 0;
    const quantity = typeof data.quantity === 'number' ? data.quantity : 0;
    const level = typeof data.level === 'number' ? data.level : max > 0 ? Math.round((quantity / max) * 100) : 0;
    await d.ref.update({
      level: Math.min(100, Math.max(0, level)),
      group: typeof data.group === 'string' ? data.group : seedStockGroup(d.id),
      unit: FieldValue.delete(),
      quantity: FieldValue.delete(),
      max: FieldValue.delete(),
      threshold: FieldValue.delete(),
      step: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    moved++;
  }
  console.log(`${snap.size} kalemden ${moved} tanesi yeni yapıya taşındı.`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
