import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Storefront } from 'phosphor-react-native';
import {
  CartBar,
  CategoryStrip,
  ProductCard,
  ProductSheet,
  Toast,
} from '@/components/ui';
import { cartCount, cartTotal, useCart } from '@/features/cart/store';
import { isSingleVariant, isSoldOut, useCategories, useProducts, useShopSettings } from '@/features/menu/api';
import { ShopStatusRow } from '@/features/menu/ShopStatusRow';
import type { ProductDoc, WithId } from '@/types/models';
import { colors, layout, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

const COLUMN_GAP = spacing.sm;

/** Misafir sepeti göndermek isteyince: sepet telefonda kalır, giriş/kayıttan sonra aynen durur. */
export function askForAccount() {
  Alert.alert(
    'Sipariş için giriş yap',
    'Sepetin kaybolmaz. Hesabın yoksa Ramazan abiden davet kodu iste.',
    [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Davet koduyla kayıt ol', onPress: () => router.push('/(auth)/register') },
      { text: 'Giriş yap', onPress: () => router.push('/(auth)/login') },
    ],
  );
}

export interface MenuScreenProps {
  /**
   * Giriş yapmamış kullanıcı: menüye göz atar, sepete ekler; sipariş göndermek için hesap istenir
   * (App Store 5.1.1(v)). Ekranın üstünde (auth) yığınının başlığı olduğu için üst güvenli alan alınmaz.
   */
  guest?: boolean;
}

export function MenuScreen({ guest = false }: MenuScreenProps) {
  const { width: windowWidth } = useWindowDimensions();
  const shop = useShopSettings();
  const { items: categories, loading: categoriesLoading, error: categoriesError } = useCategories();
  const { items: products, loading: productsLoading } = useProducts();
  const addToCart = useCart((s) => s.add);
  const cartLines = useCart((s) => s.lines);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sheetProduct, setSheetProduct] = useState<WithId<ProductDoc> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);

  const shopOpen = shop.data?.isOpen ?? false;

  // Seçili kategori silinmişse ilk kategoriye düşer
  const activeCategoryId =
    categories.find((c) => c.id === selectedCategoryId)?.id ?? categories[0]?.id ?? null;
  const iconByCategory = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.placeholderIcon])),
    [categories],
  );
  const imageByCategory = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.imageUrl])),
    [categories],
  );

  const visibleProducts = useMemo(
    () => products.filter((p) => p.categoryId === activeCategoryId),
    [products, activeCategoryId],
  );

  const contentWidth = Math.min(windowWidth, layout.contentMaxWidth) - spacing.gutter * 2;
  const cardWidth = Math.floor((contentWidth - COLUMN_GAP) / 2);

  const openProduct = (product: WithId<ProductDoc>) => {
    setSheetProduct(product);
    sheetRef.current?.present();
  };

  const quickAdd = (product: WithId<ProductDoc>) => {
    const variant = product.variants[0];
    if (!shopOpen || !variant || !isSingleVariant(product) || isSoldOut(product)) return;
    const result = addToCart({
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      singleVariant: true,
      unitPrice: variant.price,
      qty: 1,
      note: null,
    });
    if (result === 'full') {
      setToast('Sepete en fazla 15 farklı ürün ekleyebilirsin.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setToast('Sepete eklendi');
  };

  const loading = categoriesLoading || productsLoading || shop.loading;

  const rows: WithId<ProductDoc>[][] = [];
  for (let i = 0; i < visibleProducts.length; i += 2) rows.push(visibleProducts.slice(i, i + 2));

  return (
    <SafeAreaView style={styles.safeArea} edges={guest ? ['left', 'right'] : ['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.column}>
          <View style={styles.header}>
            <Text style={text.displayL} accessibilityRole="header">
              Menü
            </Text>
            {/* Kantinin anlık durumu (kantincinin panodaki anahtarlarıyla aynı görünüm) */}
            {shop.data ? <ShopStatusRow shop={shop.data} /> : null}
          </View>

          {shop.data && !shopOpen ? (
            <View style={styles.closedBanner}>
              <Storefront size={20} color={colors.ink} />
              <Text style={[text.small, styles.closedText]}>
                Kantin şu an kapalı. Menüye bakabilirsin, sipariş açılınca verebilirsin.
              </Text>
            </View>
          ) : null}
        </View>

        {categories.length > 0 ? (
          <View style={styles.strip}>
            <View style={styles.column}>
              <CategoryStrip
                categories={categories}
                selectedId={activeCategoryId}
                onSelect={setSelectedCategoryId}
              />
            </View>
          </View>
        ) : null}

        <View style={[styles.column, styles.grid]}>
          {loading ? (
            <ActivityIndicator color={colors.ink} style={styles.status} />
          ) : categoriesError ? (
            <Text style={[text.error, styles.status]}>Menü yüklenemedi. İnternet bağlantını kontrol et.</Text>
          ) : visibleProducts.length === 0 ? (
            <Text style={[text.small, styles.status]}>
              Bu kategoride henüz ürün yok.
            </Text>
          ) : (
            rows.map((row) => (
              <View key={row.map((p) => p.id).join('-')} style={styles.row}>
                {row.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    width={cardWidth}
                    placeholderIcon={iconByCategory[product.categoryId] ?? null}
                    placeholderImage={imageByCategory[product.categoryId] ?? null}
                    shopOpen={shopOpen}
                    onPress={() => openProduct(product)}
                    onQuickAdd={() => quickAdd(product)}
                  />
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {cartLines.length > 0 ? (
        <View style={styles.cartBarWrap} pointerEvents="box-none">
          <CartBar
            count={cartCount(cartLines)}
            total={cartTotal(cartLines)}
            onPress={guest ? askForAccount : () => router.push('/(student)/cart')}
            style={styles.cartBar}
          />
        </View>
      ) : null}
      <ProductSheet
        ref={sheetRef}
        product={sheetProduct ? (products.find((p) => p.id === sheetProduct.id) ?? sheetProduct) : null}
        placeholderIcon={sheetProduct ? (iconByCategory[sheetProduct.categoryId] ?? null) : null}
        placeholderImage={sheetProduct ? (imageByCategory[sheetProduct.categoryId] ?? null) : null}
        shopOpen={shopOpen}
        onAdded={setToast}
      />
      <Toast message={toast ?? ''} visible={toast !== null} onDismiss={() => setToast(null)} hapticType="none" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  scroll: {
    // Sepet çubuğu son satırları örtmesin
    paddingBottom: spacing.xxl * 2,
  },
  cartBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.sm,
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
  },
  cartBar: {
    width: '100%',
    maxWidth: layout.contentMaxWidth - spacing.gutter * 2,
  },
  column: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.gutter,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
  },
  closedText: {
    flex: 1,
    color: colors.ink,
  },
  strip: {
    marginTop: spacing.lg,
  },
  grid: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.lg,
    gap: spacing.gutter,
  },
  row: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
  },
  status: {
    paddingVertical: spacing.xl,
  },
});
