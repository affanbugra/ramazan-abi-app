import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, rounded, spacing, typography } from '@/theme/tokens';
import { formatPrice } from '@/utils/format';

export interface VariantRadioRowProps {
  name: string;
  price: number;
  selected: boolean;
  available: boolean;
  onPress: () => void;
  showDivider: boolean;
}

const RADIO = 22;

/** Ürün detayında çeşit seçimi: sol radyo, ortada ad, sağda fiyat. */
export const VariantRadioRow: React.FC<VariantRadioRowProps> = ({ name, price, selected, available, onPress, showDivider }) => {
  return (
    <Pressable
      onPress={available ? onPress : undefined}
      style={({ pressed }) => [styles.row, showDivider && styles.divider, pressed && available && styles.pressed]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !available }}
      accessibilityLabel={`${name}, ${formatPrice(price)}${available ? '' : ', tükendi'}`}
    >
      <View style={[styles.radio, selected && styles.radioSelected, !available && styles.faded]}>
        {selected ? <View style={styles.dot} /> : null}
      </View>
      <View style={[styles.textBlock, !available && styles.faded]}>
        <Text style={styles.name}>{name}</Text>
        {!available ? <Text style={styles.soldOut}>Tükendi</Text> : null}
      </View>
      <Text style={[styles.price, !available && styles.faded]}>{formatPrice(price)}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: rounded.pill,
    borderWidth: 2,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.tea,
  },
  dot: {
    width: RADIO / 2,
    height: RADIO / 2,
    borderRadius: rounded.pill,
    backgroundColor: colors.tea,
  },
  textBlock: {
    flex: 1,
  },
  name: {
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.body,
    color: colors.ink,
  },
  soldOut: {
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.caption,
    color: colors.muted,
  },
  price: {
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.body,
    color: colors.ink,
  },
  faded: {
    opacity: 0.45,
  },
});
