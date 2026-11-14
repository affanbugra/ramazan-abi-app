import type { ProductDoc } from '@/types/models';
import { formatPrice } from '@/utils/format';

/** Tek çeşit: "90 ₺", çok çeşit: "95–130 ₺" (DESIGN.md → Typography). */
export function priceLabel(product: ProductDoc): string {
  const prices = product.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPrice(min) : `${min}–${formatPrice(max)}`;
}

const TURKISH_FOLD: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

/** Türkçe karakter ve büyük/küçük harf duyarsız arama anahtarı: "Çiğ Köfte" → "cig kofte". */
export function searchKey(input: string): string {
  return input
    .replace(/[İI]/g, 'i')
    .toLowerCase()
    .replace(/[çğıöşüâîû]/g, (c) => TURKISH_FOLD[c] ?? c)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Aranan her kelime ürün adında geçiyorsa eşleşir ("kofte cig" de bulur). */
export function matchesSearch(name: string, query: string): boolean {
  const key = searchKey(name);
  return searchKey(query)
    .split(' ')
    .every((word) => key.includes(word));
}
