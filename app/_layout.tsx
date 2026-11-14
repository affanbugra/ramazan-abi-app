import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_600SemiBold,
} from '@expo-google-fonts/barlow-condensed';
import { startSessionListener, useSession } from '@/features/auth/session';
import { NotificationBridge } from '@/features/notifications/NotificationBridge';
import { setupNotificationChannels } from '@/lib/notifications';
import { colors } from '@/theme/tokens';

// Splash screen'in fontlar ve oturum bilgisi gelene kadar ekranda kalmasını sağla
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    BarlowCondensed_600SemiBold,
  });
  const session = useSession((s) => s.session);

  useEffect(() => startSessionListener(), []);
  useEffect(() => {
    setupNotificationChannels().catch(() => undefined);
  }, []);

  const ready = (fontsLoaded || Boolean(fontError)) && session.status !== 'loading';

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  const profile = session.status === 'signedIn' ? session.profile : null;
  const isActive = profile?.status === 'active';

  // Rol ve duruma göre yalnızca bir grup erişilebilir; durum değişince expo-router
  // kullanıcıyı ilk erişilebilir ekrana (index → doğru gruba) taşır.
  return (
    <GestureHandlerRootView style={styles.container}>
      <BottomSheetModalProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.ground },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Protected guard={!profile}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={profile?.status === 'suspended'}>
            <Stack.Screen name="suspended" />
          </Stack.Protected>
          <Stack.Protected guard={isActive && profile?.role === 'student'}>
            <Stack.Screen name="(student)" />
          </Stack.Protected>
          <Stack.Protected guard={isActive && profile?.role === 'admin'}>
            <Stack.Screen name="(admin)" />
          </Stack.Protected>
          <Stack.Protected guard={__DEV__}>
            <Stack.Screen name="_kitchen-sink" />
          </Stack.Protected>
        </Stack>
        {profile && isActive ? <NotificationBridge uid={profile.id} role={profile.role} /> : null}
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ground,
  },
});
