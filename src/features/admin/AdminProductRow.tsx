import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { CaretDown, CaretUp } from 'phosphor-react-native';
import { AvailabilityToggle } from '@/components/ui';
import { isSingleVariant, setProductAvailable, setVariantAvailable } from '@/features/menu/api';
import { priceLabel } from '@/features/menu/format';
import { categoryIcon } from '@/features/menu/icons';
import type { ProductDoc, WithId } from '@/types/models';
import { formatPrice } from '@/utils/format';
import { colors, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

interface AdminProductRowProps {
  product: WithId<ProductDoc>;
  placeholderIcon: string | null;
  placeholderImage?: string | null;
  onPress: () => void;
}

const THUMB = 52;

const showWriteError = () => Alert.alert('Kaydedilemedi', 'İnternet bağlantını kontrol edip tekrar dene.');

/** Menü yönetiminde ürün satırı: büyük Var/Tükendi anahtarı, çok çeşitlide açılınca çeşit anahtarları. */
export function AdminProductRow({ product, placeholderIcon, placeholderImage, onPress }: AdminProductRowProps) {
  const [expanded, setExpanded] = useState(false);
  const single = isSingleVariant(product);
  const Icon = categoryIcon(placeholderIcon);
  const soldOutVariants = product.variants.filter((v) => !v.available).length;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.main, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${product.name} düzenle`}
        >
          <View style={styles.thumb}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.thumbImage} contentFit="cover" />
            ) : placeholderImage ? (
              <Image source={{ uri: placeholderImage }} style={styles.thumbPlaceholder} contentFit="contain" />
            ) : (
              <Icon size={24} color={colors.teaDeep} />
            )}
          </View>
          <View style={styles.texts}>
            <Text style={text.bodyMedium} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={text.small}>
              {priceLabel(product)}
              {!single && soldOutVariants > 0 ? `, ${soldOutVariants} çeşit tükendi` : ''}
            </Text>
          </View>
        </Pressable>
        <AvailabilityToggle
          available={product.available}
          label={product.name}
          onChange={(v) => setProductAvailable(product.id, v).catch(showWriteError)}
        />
      </View>

      {!single ? (
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          style={styles.expander}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${product.name} çeşitleri`}
        >
          <Text style={[text.small, styles.expanderText]}>{product.variants.length} çeşit</Text>
          {expanded ? <CaretUp size={16} color={colors.ink} /> : <CaretDown size={16} color={colors.ink} />}
        </Pressable>
      ) : null}

      {expanded && !single ? (
        <View style={styles.variants}>
          {product.variants.map((v) => (
            <View key={v.id} style={styles.variantRow}>
              <Text style={[text.body, styles.variantName]}>{v.name}</Text>
              <Text style={[text.small, styles.variantPrice]}>{formatPrice(v.price)}</Text>
              <AvailabilityToggle
                compact
                available={v.available}
                label={`${product.name}, ${v.name}`}
                onChange={(value) => setVariantAvailable(product, v.id, value).catch(showWriteError)}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
  },
  pressed: {
    opacity: 0.7,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: rounded.button,
    overflow: 'hidden',
    backgroundColor: colors.teaSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    opacity: 0.5,
    width: '80%',
    height: '80%',
  },
  texts: {
    flex: 1,
  },
  expander: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    alignSelf: 'flex-start',
    marginLeft: THUMB + spacing.sm,
    minHeight: 40,
  },
  expanderText: {
    color: colors.ink,
  },
  variants: {
    marginLeft: THUMB + spacing.sm,
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  variantName: {
    flex: 1,
  },
  variantPrice: {
    color: colors.ink,
  },
});
