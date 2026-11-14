import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router, Stack } from 'expo-router';
import { MenuScreen } from '@/features/menu/MenuScreen';
import { colors, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

/** Giriş yapmadan menüye göz atma (App Store 5.1.1(v)). Sipariş göndermek hesap ister. */
export default function GuestMenuScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              hitSlop={spacing.sm}
              accessibilityRole="button"
              style={({ pressed }) => [styles.login, pressed && styles.pressed]}
            >
              <Text style={[text.bodyMedium, styles.loginText]}>Giriş yap</Text>
            </Pressable>
          ),
        }}
      />
      <MenuScreen guest />
    </>
  );
}

const styles = StyleSheet.create({
  login: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  pressed: {
    opacity: 0.6,
  },
  loginText: {
    color: colors.tea,
  },
});
