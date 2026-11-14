import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function StudentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitle: '',
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: colors.ground },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.ground },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="cart" options={{ headerShown: true }} />
      <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="profile-edit" options={{ headerShown: true }} />
      <Stack.Screen name="change-password" options={{ headerShown: true }} />
    </Stack>
  );
}
