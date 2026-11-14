import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, components, rounded, spacing, typography } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'text';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  destructive?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  destructive = false,
  accessibilityLabel,
  style,
}) => {
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'text' && styles.text,
        pressed && isInteractive && (
          variant === 'primary'
            ? styles.primaryPressed
            : styles.secondaryOrTextPressed
        ),
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.onTea : colors.ink}
          style={styles.spinner}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.primaryLabel,
          variant === 'secondary' && styles.secondaryLabel,
          variant === 'text' && (destructive ? styles.destructiveLabel : styles.textLabel),
          disabled && styles.disabledLabel,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: components.buttonPrimary.height,
    minHeight: 48,
    borderRadius: rounded.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.gutter,
  },
  primary: {
    backgroundColor: colors.tea,
  },
  primaryPressed: {
    backgroundColor: colors.teaPressed,
  },
  secondary: {
    backgroundColor: colors.ground,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  secondaryOrTextPressed: {
    backgroundColor: colors.surface,
  },
  text: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  spinner: {
    marginRight: spacing.xs,
  },
  label: {
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.body,
    lineHeight: typography.body.sizes.body * typography.body.lineHeight,
    textAlign: 'center',
  },
  primaryLabel: {
    color: colors.onTea,
  },
  secondaryLabel: {
    color: colors.ink,
  },
  textLabel: {
    color: colors.ink,
  },
  destructiveLabel: {
    color: colors.alert,
  },
  disabledLabel: {
    color: colors.muted,
  },
});
