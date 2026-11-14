// Sepet: uygulama kapanınca kaybolmasın diye AsyncStorage'da saklanır (PROJE.md 6.3).
// Buradaki fiyatlar sadece gösterim içindir; sipariş toplamını sunucu hesaplar.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const MAX_QTY = 10;
export const MAX_LINES = 15;

export interface CartLine {
  key: string; // ürün + çeşit + not; aynı satır tekrar eklenince adet artar
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  singleVariant: boolean;
  unitPrice: number;
  qty: number;
  note: string | null;
}

export type NewCartLine = Omit<CartLine, 'key'>;

interface CartState {
  lines: CartLine[];
  note: string;
  add: (line: NewCartLine) => 'added' | 'full';
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  setNote: (note: string) => void;
  clear: () => void;
}

function lineKey(line: Pick<CartLine, 'productId' | 'variantId' | 'note'>): string {
  return `${line.productId}|${line.variantId}|${line.note ?? ''}`;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      note: '',
      add: (line) => {
        const key = lineKey(line);
        const existing = get().lines.find((l) => l.key === key);
        if (existing) {
          set({
            lines: get().lines.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + line.qty) } : l)),
          });
          return 'added';
        }
        if (get().lines.length >= MAX_LINES) return 'full';
        set({ lines: [...get().lines, { ...line, key, qty: Math.min(MAX_QTY, line.qty) }] });
        return 'added';
      },
      setQty: (key, qty) => {
        if (qty <= 0) {
          set({ lines: get().lines.filter((l) => l.key !== key) });
          return;
        }
        set({ lines: get().lines.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)) });
      },
      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),
      setNote: (note) => set({ note }),
      clear: () => set({ lines: [], note: '' }),
    }),
    { name: 'cart-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}
