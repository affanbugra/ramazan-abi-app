import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionTitle?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionTitle,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="secondary"
          style={styles.actionButton}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.sizes.m,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: typography.display.letterSpacing,
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.small,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: typography.body.sizes.small * typography.body.lineHeight,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: spacing.lg,
    minWidth: 160,
  },
});
