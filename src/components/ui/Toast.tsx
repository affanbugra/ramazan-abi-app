import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, rounded, shadows, spacing, typography } from '@/theme/tokens';

export interface ToastProps {
  message: string;
  visible: boolean;
  onDismiss?: () => void;
  duration?: number;
  hapticType?: 'light' | 'success' | 'warning' | 'none';
  style?: StyleProp<ViewStyle>;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  visible,
  onDismiss,
  duration = 2500,
  hapticType = 'light',
  style,
}) => {
  // Satır içi verilen onDismiss her render'da değişir; effect'i yeniden tetiklemesin diye ref'te tutulur
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!visible) return;
    if (hapticType === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else if (hapticType === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (hapticType === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }

    if (duration > 0) {
      const timer = setTimeout(() => onDismissRef.current?.(), duration);
      return () => clearTimeout(timer);
    }
  }, [visible, message, duration, hapticType]);

  if (!visible) return null;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.ink,
    borderRadius: rounded.pill,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
    alignSelf: 'center',
    position: 'absolute',
    bottom: 40,
    zIndex: 9999,
    maxWidth: '90%',
    ...shadows.floating,
  },
  text: {
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.small,
    color: colors.ground,
    textAlign: 'center',
  },
});
