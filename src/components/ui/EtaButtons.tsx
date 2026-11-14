import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ETA_CHOICES } from '@/features/admin/orderActions';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

export interface EtaButtonsProps {
  onPick: (minutes: number) => void;
  disabled?: boolean;
  /** Pano kartında tek sıra: "5 10 15 20 30 Diğer" (birim üstte yazılır) */
  compact?: boolean;
}

const MIN_TOUCH = 48;

/** Yeni siparişe süre verme: 5/10/15/20/30 dk + "Diğer" (1-120). Yağlı parmakla basılacak kadar büyük. */
export const EtaButtons: React.FC<EtaButtonsProps> = ({ onPick, disabled = false, compact = false }) => {
  const [custom, setCustom] = useState<string | null>(null);
  const customValue = Number(custom);
  const customValid = custom !== null && Number.isInteger(customValue) && customValue >= 1 && customValue <= 120;

  return (
    <View>
      <View style={[styles.grid, compact && styles.row]}>
        {ETA_CHOICES.map((m) => (
          <Pressable
            key={m}
            disabled={disabled}
            onPress={() => onPick(m)}
            style={({ pressed }) => [styles.button, compact && styles.compactButton, pressed && styles.pressed, disabled && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={`${m} dakika`}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.label}>
              {compact ? m : `${m} dk`}
            </Text>
          </Pressable>
        ))}
        <Pressable
          disabled={disabled}
          onPress={() => setCustom((c) => (c === null ? '' : null))}
          style={({ pressed }) => [styles.button, compact && styles.compactButton, custom !== null && styles.selected, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Başka süre gir"
        >
          <Text style={[styles.label, custom !== null && styles.selectedLabel]}>Diğer</Text>
        </Pressable>
      </View>
      {custom !== null ? (
        <View style={styles.customRow}>
          <TextInput
            value={custom}
            onChangeText={(v) => setCustom(v.replace(/\D/g, '').slice(0, 3))}
            placeholder="Dakika"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
            autoFocus
            style={styles.input}
            accessibilityLabel="Dakika, 1 ile 120 arası"
          />
          <Pressable
            disabled={!customValid || disabled}
            onPress={() => {
              onPick(customValue);
              setCustom(null);
            }}
            style={({ pressed }) => [styles.giveButton, (!customValid || disabled) && styles.disabled, pressed && styles.givePressed]}
            accessibilityRole="button"
            accessibilityLabel="Süreyi ver"
          >
            <Text style={styles.giveLabel}>Süre ver</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  row: {
    flexWrap: 'nowrap',
  },
  compactButton: {
    flexBasis: 0,
    flexGrow: 1,
    paddingHorizontal: 0,
  },
  button: {
    minHeight: MIN_TOUCH,
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: rounded.button,
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.hairline,
  },
  selected: {
    backgroundColor: colors.ink,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.body,
    color: colors.ink,
  },
  selectedLabel: {
    color: colors.ground,
  },
  customRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: rounded.input,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.ground,
    paddingHorizontal: spacing.md,
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.body,
    color: colors.ink,
  },
  giveButton: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: rounded.button,
    backgroundColor: colors.tea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  givePressed: {
    backgroundColor: colors.teaPressed,
  },
  giveLabel: {
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.body,
    color: colors.onTea,
  },
});
