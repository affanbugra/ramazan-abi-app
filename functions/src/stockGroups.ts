// seed/stok.json kalemlerinin grupları (JSON elle değiştirilmez; eşleştirme burada)
import type { StockGroup } from './models';

export const SEED_STOCK_GROUPS: Record<string, StockGroup> = {
  ekmek: 'ekmek',
  'tost-ekmegi': 'ekmek',
  lavas: 'ekmek',
  tavuk: 'et',
  'tantuni-eti': 'et',
  kavurma: 'et',
  kofte: 'et',
  'adana-kiyma': 'et',
  sucuk: 'et',
  'cig-kofte': 'et',
  kasar: 'kahvaltilik',
  yumurta: 'kahvaltilik',
  tereyagi: 'kahvaltilik',
  domates: 'sebze',
  biber: 'sebze',
  sogan: 'sebze',
  nugget: 'donuk',
  patates: 'donuk',
  pizza: 'donuk',
  'ton-baligi': 'donuk',
};

export function seedStockGroup(id: string): StockGroup {
  return SEED_STOCK_GROUPS[id] ?? 'diger';
}
