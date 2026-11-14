import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: colors.ground },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.ground },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
    </Stack>
  );
}
