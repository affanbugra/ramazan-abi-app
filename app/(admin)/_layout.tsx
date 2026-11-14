import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useSession } from '@/features/auth/session';
import { NotificationPrompt } from '@/features/notifications/NotificationPrompt';
import { shouldShowPrompt } from '@/lib/notifications';
import { colors } from '@/theme/tokens';

export default function AdminLayout() {
  const session = useSession((s) => s.session);
  const uid = session.status === 'signedIn' ? session.profile.id : null;
  const [promptVisible, setPromptVisible] = useState(false);

  // Kantincide ilk girişte bildirim izni ön-ekranı (PROJE.md 9)
  useEffect(() => {
    shouldShowPrompt()
      .then(setPromptVisible)
      .catch(() => undefined);
  }, []);

  return (
    <>
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
        <Stack.Screen name="invites" options={{ headerShown: true }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="category/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="reorder" options={{ headerShown: true }} />
        <Stack.Screen name="shop-settings" options={{ headerShown: true }} />
        <Stack.Screen name="order/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="reports" options={{ headerShown: true }} />
        <Stack.Screen name="profile" options={{ headerShown: true }} />
        <Stack.Screen name="profile-edit" options={{ headerShown: true }} />
        <Stack.Screen name="change-password" options={{ headerShown: true }} />
      </Stack>
      {uid ? <NotificationPrompt visible={promptVisible} uid={uid} role="admin" onClose={() => setPromptVisible(false)} /> : null}
    </>
  );
}
