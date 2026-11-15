import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ETA_CHOICES } from '@/features/admin/orderActions';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

export interface EtaButtonsProps {
  onPick: (minutes: number) => void;
  disabled?: boolean;
  /** Pano kartında tek sıra: "15 20 25 30 35 40 45" (birim üstte yazılır) */
  compact?: boolean;
}

const MIN_TOUCH = 48;

/** Yeni siparişe süre verme: 15-45 dk, 5'er dakika. Yağlı parmakla basılacak kadar büyük. */
export const EtaButtons: React.FC<EtaButtonsProps> = ({ onPick, disabled = false, compact = false }) => {
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
      </View>
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
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.body,
    color: colors.ink,
  },
});
