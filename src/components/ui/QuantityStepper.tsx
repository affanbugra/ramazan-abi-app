import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'phosphor-react-native';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Sepette 1'den aşağı inince satır silinir; o zaman eksi ikonunun etiketi değişir. */
  minusLabel?: string;
}

const BUTTON = 44;

export const QuantityStepper: React.FC<QuantityStepperProps> = ({ value, onChange, min = 1, max = 10, minusLabel }) => {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => canDecrease && onChange(value - 1)}
        style={({ pressed }) => [styles.button, pressed && canDecrease && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={minusLabel ?? 'Bir azalt'}
        accessibilityState={{ disabled: !canDecrease }}
      >
        <Minus size={20} color={canDecrease ? colors.ink : colors.hairline} weight="bold" />
      </Pressable>
      <Text style={styles.value} accessibilityLabel={`Adet ${value}`}>
        {value}
      </Text>
      <Pressable
        onPress={() => canIncrease && onChange(value + 1)}
        style={({ pressed }) => [styles.button, pressed && canIncrease && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Bir artır"
        accessibilityState={{ disabled: !canIncrease }}
      >
        <Plus size={20} color={canIncrease ? colors.ink : colors.hairline} weight="bold" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: rounded.pill,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: rounded.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  value: {
    minWidth: spacing.lg,
    textAlign: 'center',
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.body,
    color: colors.ink,
  },
});
