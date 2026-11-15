// Siparişte görünen ürün adı: kantinci "Sucuklu Yumurta" gibi tek bir ad görsün, "Yumurta, Sucuklu" değil.
// Kural: tek çeşitli ya da "Sade/Standart" çeşitte yalnız ürün adı; tek kelimelik üründe çeşit başa
// ("Sucuklu Yumurta"); çok kelimelik üründe çeşit son kelimeden önce ("Sebzeli Kaşarlı Yumurta").

const PLAIN_VARIANTS = new Set(['sade', 'standart']);

// Kurala uymayan ürünler: çeşit, verilen önekle yazılır ("Patsolu ekmek arası" + "Tavuk" → "Patsolu Tavuk")
const PREFIX_PRODUCTS: Record<string, string> = {
  'patsolu ekmek arası': 'Patsolu',
};

function lower(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR'))
    .join(' ');
}

export function orderItemName(productName: string, variantName: string, variantCount: number): string {
  const product = titleCase(productName);
  if (variantCount <= 1 || PLAIN_VARIANTS.has(lower(variantName))) return product;
  const variant = titleCase(variantName);
  const prefix = PREFIX_PRODUCTS[lower(productName)];
  if (prefix) return `${prefix} ${variant}`;
  const words = product.split(' ');
  if (words.length === 1) return `${variant} ${product}`;
  return [...words.slice(0, -1), variant, words[words.length - 1]].join(' ');
}

/** "1.10.0" ile "1.9.2" sayısal karşılaştırılır; eksik/bozuk sürüm en eski sayılır. */
export function isVersionAtLeast(version: unknown, min: string): boolean {
  if (typeof version !== 'string') return false;
  const a = version.split('.').map((n) => Number.parseInt(n, 10));
  const b = min.split('.').map((n) => Number.parseInt(n, 10));
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = Number.isFinite(a[i]) ? a[i] : 0;
    const y = Number.isFinite(b[i]) ? b[i] : 0;
    if (x !== y) return x > y;
  }
  return true;
}
