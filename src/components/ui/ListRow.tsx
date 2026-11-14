import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { colors, spacing, typography } from '@/theme/tokens';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
  hasBottomDivider?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  value,
  icon,
  showChevron = true,
  onPress,
  destructive = false,
  hasBottomDivider = true,
  style,
}) => {
  const content = (
    <View style={[styles.container, style]}>
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            destructive ? styles.destructiveTitle : styles.normalTitle,
          ]}
        >
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {showChevron && onPress ? (
        <CaretRight
          size={18}
          color={colors.muted}
          weight="bold"
          style={styles.chevron}
        />
      ) : null}
      {hasBottomDivider ? <View style={styles.divider} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.pressable,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  pressable: {
    backgroundColor: colors.ground,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  container: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  iconContainer: {
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.body,
  },
  normalTitle: {
    color: colors.ink,
  },
  destructiveTitle: {
    color: colors.alert,
  },
  subtitle: {
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.caption,
    color: colors.muted,
    marginTop: 2,
  },
  value: {
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.small,
    color: colors.muted,
    marginRight: spacing.xs,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: spacing.gutter,
    right: 0,
    height: 1,
    backgroundColor: colors.hairline,
  },
});
