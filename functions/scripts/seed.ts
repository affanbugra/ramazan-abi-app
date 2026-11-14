// Kullanım (functions/ içinde): npm run seed
// seed/menu.json ve seed/stok.json'u yükler. İdempotent (PROJE.md Bölüm 11 adım 9):
// - Var olan kategori/ürünün hiçbir alanını ezmez; sadece eksik alanları ve yeni çeşitleri ekler.
// - settings/shop yoksa oluşturur.
// - stockItems sadece koleksiyon boşsa yazılır.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FieldValue, getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { initAdmin } from './init-admin';
import type { Variant } from '../src/models';
import { seedStockGroup } from '../src/stockGroups';

interface SeedCategory {
  id: string;
  name: string;
  order: number;
  placeholderIcon: string;
}
interface SeedProduct {
  id: string;
  categoryId: string;
  name: string;
  order: number;
  typicalPrepMin?: number;
  variants: { id: string; name: string; price: number }[];
}
interface SeedStockItem {
  id: string;
  name: string;
  order: number;
}

// lib/scripts/seed.js → App/seed/
const SEED_DIR = path.resolve(__dirname, '../../../seed');

function readSeed<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(SEED_DIR, file), 'utf8')) as T;
}

/** Var olan dokümanda olmayan alanları döndürür (var olanlara dokunmaz). */
function missingFields(existing: DocumentData, wanted: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(wanted)) {
    if (!(key in existing)) out[key] = value;
  }
  return out;
}

async function main(): Promise<void> {
  initAdmin();
  const db = getFirestore();
  const menu = readSeed<{ categories: SeedCategory[]; products: SeedProduct[] }>('menu.json');
  const stock = readSeed<{ items: SeedStockItem[] }>('stok.json');

  let created = 0;
  let patched = 0;

  for (const c of menu.categories) {
    const ref = db.doc(`categories/${c.id}`);
    const snap = await ref.get();
    const wanted = { name: c.name, order: c.order, imageUrl: null, placeholderIcon: c.placeholderIcon };
    if (!snap.exists) {
      await ref.set({ ...wanted, updatedAt: FieldValue.serverTimestamp() });
      created++;
      continue;
    }
    const patch = missingFields(snap.data() ?? {}, wanted);
    if (Object.keys(patch).length > 0) {
      await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
      patched++;
    }
  }

  for (const p of menu.products) {
    const ref = db.doc(`products/${p.id}`);
    const snap = await ref.get();
    const seedVariants: Variant[] = p.variants.map((v) => ({ ...v, available: true }));
    const wanted = {
      categoryId: p.categoryId,
      name: p.name,
      order: p.order,
      imageUrl: null,
      typicalPrepMin: p.typicalPrepMin ?? null,
      available: true,
    };
    if (!snap.exists) {
      await ref.set({ ...wanted, variants: seedVariants, updatedAt: FieldValue.serverTimestamp() });
      created++;
      continue;
    }
    const data = snap.data() ?? {};
    const patch = missingFields(data, wanted);
    const currentVariants = Array.isArray(data.variants) ? (data.variants as Variant[]) : [];
    const newVariants = seedVariants.filter((v) => !currentVariants.some((cv) => cv.id === v.id));
    if (newVariants.length > 0) patch.variants = [...currentVariants, ...newVariants];
    if (Object.keys(patch).length > 0) {
      await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
      patched++;
    }
  }

  const shopRef = db.doc('settings/shop');
  if (!(await shopRef.get()).exists) {
    await shopRef.set({
      isOpen: false,
      busyLevel: 'normal',
      maxActiveOrders: 2,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'seed',
    });
    console.log('settings/shop oluşturuldu (kapalı).');
  }

  const stockEmpty = (await db.collection('stockItems').limit(1).get()).empty;
  if (stockEmpty) {
    const batch = db.batch();
    for (const s of stock.items) {
      // Yalnızca ad ve sıra kullanılır; birim/miktar alanları artık yok (0-100 doluluk + grup)
      batch.set(db.doc(`stockItems/${s.id}`), {
        name: s.name,
        group: seedStockGroup(s.id),
        level: 0,
        order: s.order,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: 'seed',
      });
    }
    await batch.commit();
    console.log(`${stock.items.length} stok kalemi yazıldı.`);
  } else {
    console.log('stockItems boş değil, stok listesine dokunulmadı.');
  }

  console.log(`Menü: ${created} yeni doküman, ${patched} dokümana eksik alan eklendi.`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
