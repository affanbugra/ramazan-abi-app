import React from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { MagnifyingGlass, X } from 'phosphor-react-native';
import { colors, rounded, shadows, spacing, typography } from '@/theme/tokens';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

/** Hap şeklinde, hafif gölgeli arama çubuğu (DESIGN.md → Menü ekranı). */
export const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText, placeholder = 'Ne yiyelim?', style }) => {
  return (
    <View style={[styles.container, style]}>
      <MagnifyingGlass size={20} color={colors.ink} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel="Menüde ara"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Aramayı temizle"
        >
          <X size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    borderRadius: rounded.pill,
    backgroundColor: colors.ground,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    ...shadows.floating,
  },
  input: {
    flex: 1,
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.body,
    color: colors.ink,
    paddingVertical: spacing.sm,
  },
});
