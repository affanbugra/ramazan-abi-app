import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  type TextInputInstance,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: React.Ref<TextInputInstance>;
  /** Bottom sheet içinde BottomSheetTextInput verilir (klavye ile sheet birlikte kayar). */
  InputComponent?: React.ComponentType<TextInputProps>;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  hint,
  containerStyle,
  onFocus,
  onBlur,
  editable = true,
  ref,
  InputComponent,
  ...inputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const hasError = Boolean(error);
  // Şifre alanı: iOS ilk harfi kendiliğinden büyütmesin, düzeltme yapmasın; göz ikonuyla görünür yapılabilsin
  const isPassword = Boolean(inputProps.secureTextEntry);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, hasError && styles.labelError]}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          hasError && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        {(() => {
          const shared: TextInputProps = {
            placeholderTextColor: colors.placeholder,
            editable,
            onFocus: (e) => {
              setIsFocused(true);
              onFocus?.(e);
            },
            onBlur: (e) => {
              setIsFocused(false);
              onBlur?.(e);
            },
            style: styles.input,
            ...inputProps,
            ...(isPassword
              ? { secureTextEntry: !revealed, autoCapitalize: 'none' as const, autoCorrect: false, spellCheck: false }
              : null),
          };
          return InputComponent ? <InputComponent {...shared} /> : <TextInput ref={ref} {...shared} />;
        })()}
        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Şifreyi gizle' : 'Şifreyi göster'}
          >
            {revealed ? <EyeSlash size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}
          </Pressable>
        ) : null}
      </View>
      {hasError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.small,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  labelError: {
    color: colors.alert,
  },
  inputContainer: {
    minHeight: 52,
    borderRadius: rounded.input,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eye: {
    marginLeft: spacing.xs,
  },
  inputFocused: {
    borderColor: colors.ink,
    backgroundColor: colors.ground,
  },
  inputError: {
    borderColor: colors.alert,
    backgroundColor: colors.ground,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.body,
    color: colors.ink,
    paddingVertical: spacing.sm,
  },
  errorText: {
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.caption,
    color: colors.alert,
    marginTop: spacing.xxs,
  },
  hintText: {
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.caption,
    color: colors.muted,
    marginTop: spacing.xxs,
  },
});
