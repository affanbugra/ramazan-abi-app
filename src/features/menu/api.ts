import {
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, typedCollection, typedDoc } from '@/lib/firebase';
import { deleteImageByUrl } from '@/lib/images';
import { useLiveCollection, useLiveDocument } from '@/lib/useFirestore';
import type { CategoryDoc, ProductDoc, ShopSettings, Variant, WithId } from '@/types/models';

// --- Okuma (öğrenci + admin) ---

export function useShopSettings() {
  return useLiveDocument(typedDoc<ShopSettings>('settings/shop'));
}

export function useCategories() {
  return useLiveCollection('categories', () => query(typedCollection<CategoryDoc>('categories'), orderBy('order')));
}

export function useProducts() {
  return useLiveCollection('products', () => query(typedCollection<ProductDoc>('products'), orderBy('order')));
}

/** Tek çeşitli ürünün çeşidi arayüzde gösterilmez (PROJE.md 5). */
export function isSingleVariant(product: ProductDoc): boolean {
  return product.variants.length === 1;
}

/** Ürün ya da seçilen çeşit tükendiyse sepete eklenemez. */
export function isVariantOrderable(product: ProductDoc, variant: Variant): boolean {
  return product.available && variant.available;
}

export function firstAvailableVariant(product: ProductDoc): Variant | null {
  return product.variants.find((v) => v.available) ?? null;
}

/** Ürün kartında "Tükendi" görünsün mü: ürün kapalı ya da hiçbir çeşit müsait değil. */
export function isSoldOut(product: ProductDoc): boolean {
  return !product.available || product.variants.every((v) => !v.available);
}

// --- Yazma (sadece admin; kurallar zorlar) ---

export function setProductAvailable(productId: string, available: boolean) {
  return updateDoc(typedDoc<ProductDoc>(`products/${productId}`), { available, updatedAt: serverTimestamp() });
}

export function setVariantAvailable(product: WithId<ProductDoc>, variantId: string, available: boolean) {
  const variants = product.variants.map((v) => (v.id === variantId ? { ...v, available } : v));
  return updateDoc(typedDoc<ProductDoc>(`products/${product.id}`), { variants, updatedAt: serverTimestamp() });
}

export type ProductInput = Omit<ProductDoc, 'updatedAt'>;

/** Yeni ürün için Firestore'dan çakışmasız bir id alır (fotoğraf yolu bu id'yi kullanır). */
export function newProductId(): string {
  return doc(typedCollection<ProductDoc>('products')).id;
}

export function saveProduct(productId: string, input: ProductInput) {
  return setDoc(typedDoc<ProductDoc>(`products/${productId}`), { ...input, updatedAt: serverTimestamp() });
}

export async function deleteProduct(product: WithId<ProductDoc>) {
  await deleteDoc(doc(db, 'products', product.id));
  if (product.imageUrl) await deleteImageByUrl(product.imageUrl);
}

export type CategoryInput = Omit<CategoryDoc, 'updatedAt'>;

export function newCategoryId(): string {
  return doc(typedCollection<CategoryDoc>('categories')).id;
}

export function saveCategory(categoryId: string, input: CategoryInput) {
  return setDoc(typedDoc<CategoryDoc>(`categories/${categoryId}`), { ...input, updatedAt: serverTimestamp() });
}

export async function deleteCategory(category: WithId<CategoryDoc>) {
  await deleteDoc(doc(db, 'categories', category.id));
  if (category.imageUrl) await deleteImageByUrl(category.imageUrl);
}

/** Sürükle-bırak sonrası sırayı 1..n olarak yazar. */
export function saveOrder(collectionName: 'categories' | 'products' | 'stockItems', orderedIds: string[]) {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => batch.update(doc(db, collectionName, id), { order: index + 1 }));
  return batch.commit();
}

export function updateShopSettings(
  uid: string,
  patch: Partial<Pick<ShopSettings, 'isOpen' | 'prayerBreak' | 'teaReady' | 'maxActiveOrders'>>,
) {
  return updateDoc(typedDoc<ShopSettings>('settings/shop'), { ...patch, updatedAt: serverTimestamp(), updatedBy: uid });
}
