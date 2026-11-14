import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, rounded, shadows, spacing, typography } from '@/theme/tokens';
import { formatPrice } from '@/utils/format';

export interface CartBarProps {
  count: number;
  total: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Sepette ürün varken sekme çubuğunun üstünde duran tea çubuk (DESIGN.md → Sepet çubuğu). */
export const CartBar: React.FC<CartBarProps> = ({ count, total, onPress, style }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.bar, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={`Sepetim, ${count} ürün, ${formatPrice(total)}`}
    >
      <Text style={styles.label}>Sepetim, {count} ürün</Text>
      <Text style={styles.total}>{formatPrice(total)}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  bar: {
    minHeight: 56,
    borderRadius: rounded.card,
    backgroundColor: colors.tea,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    ...shadows.floating,
  },
  pressed: {
    backgroundColor: colors.teaPressed,
  },
  label: {
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.body,
    color: colors.onTea,
  },
  total: {
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.body,
    color: colors.onTea,
  },
});
