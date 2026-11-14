import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
  style,
}) => {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.idle,
        pressed && !disabled && (selected ? styles.selectedPressed : styles.idlePressed),
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <>{icon}</> : null}
      <Text
        // Dar kontrol: büyük yazı ayarında büyüme sınırlı; sığmazsa kesilmek yerine biraz küçülür
        maxFontSizeMultiplier={1.4}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[
          styles.label,
          selected ? styles.selectedLabel : styles.idleLabel,
          Boolean(icon) && styles.labelWithIcon,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    borderRadius: rounded.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  idle: {
    backgroundColor: colors.ground,
    borderColor: colors.hairline,
  },
  idlePressed: {
    backgroundColor: colors.surface,
  },
  selected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  selectedPressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.small,
  },
  labelWithIcon: {
    marginLeft: spacing.xs,
  },
  idleLabel: {
    color: colors.ink,
  },
  selectedLabel: {
    color: colors.ground,
  },
});
