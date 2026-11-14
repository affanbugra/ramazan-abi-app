import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Plus } from 'phosphor-react-native';
import { isSingleVariant, isSoldOut } from '@/features/menu/api';
import { priceLabel } from '@/features/menu/format';
import { categoryIcon } from '@/features/menu/icons';
import type { ProductDoc, WithId } from '@/types/models';
import { colors, rounded, shadows, spacing, typography } from '@/theme/tokens';

export interface ProductCardProps {
  product: WithId<ProductDoc>;
  width: number;
  placeholderIcon: string | null;
  /** Ürün fotoğrafı yoksa kategorinin arka plansız fotoğrafı gösterilir */
  placeholderImage?: string | null;
  shopOpen: boolean;
  onPress: () => void;
  onQuickAdd: () => void;
}

const ADD_SIZE = 36;

/** Airbnb kartı gibi kutusuz: kare fotoğraf + altında ad, fiyat, çeşit sayısı. */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  width,
  placeholderIcon,
  placeholderImage,
  shopOpen,
  onPress,
  onQuickAdd,
}) => {
  const soldOut = isSoldOut(product);
  const single = isSingleVariant(product);
  const Icon = categoryIcon(placeholderIcon);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${priceLabel(product)}${soldOut ? ', tükendi' : ''}`}
    >
      <View style={[styles.photo, { width, height: width }]}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} contentFit="cover" transition={150} />
        ) : (
          <View style={styles.placeholder}>
            {placeholderImage ? (
              <Image source={{ uri: placeholderImage }} style={styles.placeholderImage} contentFit="contain" transition={150} />
            ) : (
              <Icon size={40} color={colors.teaDeep} weight="regular" />
            )}
          </View>
        )}
        {soldOut ? (
          <>
            <View style={styles.soldOutWash} />
            <View style={[styles.pill, styles.pillLeft]}>
              <Text style={styles.pillText}>Tükendi</Text>
            </View>
          </>
        ) : !shopOpen ? (
          <View style={[styles.pill, styles.pillRight]}>
            <Text style={styles.pillText}>Kapalı</Text>
          </View>
        ) : single ? (
          <Pressable
            onPress={onQuickAdd}
            hitSlop={8}
            style={({ pressed }) => [styles.addButton, pressed && styles.addPressed]}
            accessibilityRole="button"
            accessibilityLabel={`${product.name} sepete ekle`}
          >
            <Plus size={20} color={colors.tea} weight="bold" />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.price}>{priceLabel(product)}</Text>
      {!single ? <Text style={styles.variants}>{product.variants.length} çeşit</Text> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  photo: {
    borderRadius: rounded.photo,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.teaSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ürünün kendi fotoğrafı sanılmasın: kategori ipucu olarak yarı saydam
  placeholderImage: {
    opacity: 0.5,
    width: '70%',
    height: '70%',
  },
  // Gri ton filtresi iOS'ta desteklenmediği için beyaz bir örtüyle soluklaştırılır
  soldOutWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.ground,
    opacity: 0.45,
  },
  pill: {
    position: 'absolute',
    bottom: spacing.xs,
    backgroundColor: colors.ground,
    borderRadius: rounded.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  pillLeft: {
    left: spacing.xs,
  },
  pillRight: {
    right: spacing.xs,
  },
  pillText: {
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.caption,
    color: colors.ink,
  },
  addButton: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    width: ADD_SIZE,
    height: ADD_SIZE,
    borderRadius: rounded.pill,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  addPressed: {
    backgroundColor: colors.surface,
  },
  name: {
    marginTop: spacing.xs,
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.body,
    lineHeight: typography.body.sizes.body * typography.body.lineHeight,
    color: colors.ink,
  },
  price: {
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.body,
    color: colors.ink,
  },
  variants: {
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.small,
    color: colors.muted,
  },
});
