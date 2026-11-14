import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, X } from 'phosphor-react-native';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

export interface AvailabilityToggleProps {
  available: boolean;
  onChange: (available: boolean) => void;
  /** Ekran okuyucu için neyin anahtarı olduğu: "Menemen", "Kaşarlı" */
  label: string;
  compact?: boolean;
}

/** Kantincinin tek dokunuşluk "Var / Tükendi" anahtarı (DESIGN.md → Components). */
export const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({ available, onChange, label, compact = false }) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(!available);
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={compact ? 4 : 0}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        available ? styles.on : styles.off,
        pressed && styles.pressed,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: available }}
      accessibilityLabel={`${label}: ${available ? 'var' : 'tükendi'}`}
    >
      {available ? (
        <Check size={18} color={colors.fresh} weight="bold" />
      ) : (
        <X size={18} color={colors.alert} weight="bold" />
      )}
      <Text style={[styles.label, available ? styles.labelOn : styles.labelOff]}>{available ? 'Var' : 'Tükendi'}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    minWidth: 112,
    borderRadius: rounded.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
  },
  compact: {
    minHeight: 40,
    minWidth: 104,
  },
  on: {
    backgroundColor: colors.freshSoft,
  },
  off: {
    backgroundColor: colors.alertSoft,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.small,
  },
  labelOn: {
    color: colors.fresh,
  },
  labelOff: {
    color: colors.alert,
  },
});
