import { deleteDoc, doc, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, typedCollection, typedDoc } from '@/lib/firebase';
import { useLiveCollection } from '@/lib/useFirestore';
import type { StockGroup, StockItemDoc, WithId } from '@/types/models';

/** Katlanabilir gruplar, ekrandaki sırayla. */
export const STOCK_GROUPS: { key: StockGroup; label: string }[] = [
  { key: 'ekmek', label: 'Ekmek' },
  { key: 'et', label: 'Et ve tavuk' },
  { key: 'kahvaltilik', label: 'Kahvaltılık' },
  { key: 'sebze', label: 'Sebze' },
  { key: 'donuk', label: 'Donuk ve hazır' },
  { key: 'diger', label: 'Diğer' },
];

export const LOW_LEVEL = 20;
export const OK_LEVEL = 50;
export const LEVEL_STEP = 5;

/** %20 altı kırmızı (Alınacaklar), %20-50 turuncu, %50 üstü yeşil. */
export function levelTone(level: number): 'low' | 'mid' | 'ok' {
  if (level < LOW_LEVEL) return 'low';
  if (level <= OK_LEVEL) return 'mid';
  return 'ok';
}

export function isLow(item: Pick<StockItemDoc, 'level'>): boolean {
  return item.level < LOW_LEVEL;
}

/** Adıma yuvarlar, 0..100 arasında tutar. */
export function roundLevel(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value / LEVEL_STEP) * LEVEL_STEP));
}

export function useStockItems() {
  return useLiveCollection('stock', () => query(typedCollection<StockItemDoc>('stockItems'), orderBy('order')));
}

export function setLevel(id: string, level: number, uid: string) {
  return updateDoc(typedDoc<StockItemDoc>(`stockItems/${id}`), {
    level,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

export function newStockItemId(): string {
  return doc(typedCollection<StockItemDoc>('stockItems')).id;
}

export function saveStockItem(id: string, input: Pick<StockItemDoc, 'name' | 'group' | 'level' | 'order'>, uid: string) {
  return setDoc(typedDoc<StockItemDoc>(`stockItems/${id}`), { ...input, updatedAt: serverTimestamp(), updatedBy: uid });
}

export function deleteStockItem(id: string) {
  return deleteDoc(doc(db, 'stockItems', id));
}

