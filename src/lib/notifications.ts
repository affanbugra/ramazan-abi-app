// İstemci bildirimleri (PROJE.md 9): izin, Expo push token'ı, Android kanalları, bildirime dokunma.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { arrayRemove, arrayUnion, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { typedDoc } from '@/lib/firebase';
import type { UserDoc } from '@/types/models';

const PROMPT_DISMISSED_KEY = 'notif-prompt-dismissed-v1';
let currentToken: string | null = null;

// Uygulama açıkken de banner + ses gösterilir
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Uygulama açılışında bir kez: Android kanalları. */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('orders', {
    name: 'Sipariş durumu',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('new-orders', {
    name: 'Yeni siparişler',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function permissionState(): Promise<PermissionState> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/** Kendi ön-ekranımız gösterilsin mi: hiç sorulmadıysa ve "Şimdi değil" denmediyse. */
export async function shouldShowPrompt(): Promise<boolean> {
  if (!Device.isDevice) return false;
  if ((await permissionState()) !== 'undetermined') return false;
  try {
    return (await AsyncStorage.getItem(PROMPT_DISMISSED_KEY)) === null;
  } catch {
    return true;
  }
}

export async function dismissPrompt(): Promise<void> {
  await AsyncStorage.setItem(PROMPT_DISMISSED_KEY, '1').catch(() => undefined);
}

/** Token'ı alıp users/{uid}.pushTokens'a ekler. Gerçek cihaz değilse ya da izin yoksa sessizce çıkar. */
export async function registerPushToken(uid: string): Promise<void> {
  if (!Device.isDevice) return;
  if ((await permissionState()) !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = data;
    await updateDoc(typedDoc<UserDoc>(`users/${uid}`), { pushTokens: arrayUnion(data) });
  } catch (err) {
    console.warn('Push token alınamadı', err);
  }
}

/** Sistem izin penceresini açar; izin verilirse token kaydedilir. */
export async function requestPermissionAndRegister(uid: string): Promise<PermissionState> {
  const { status } = await Notifications.requestPermissionsAsync();
  await dismissPrompt();
  if (status === 'granted') await registerPushToken(uid);
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/** Çıkışta bu cihazın token'ı silinir; bu cihaza bildirim gitmesin. */
export async function unregisterPushToken(uid: string): Promise<void> {
  if (!currentToken) return;
  try {
    await updateDoc(typedDoc<UserDoc>(`users/${uid}`), { pushTokens: arrayRemove(currentToken) });
  } catch (err) {
    console.warn('Push token silinemedi', err);
  }
  currentToken = null;
}

/** Bildirimdeki sipariş id'si (data: { type, orderId }). */
export function orderIdFromResponse(response: Notifications.NotificationResponse | null): string | null {
  const data = response?.notification.request.content.data as { orderId?: unknown } | undefined;
  return typeof data?.orderId === 'string' ? data.orderId : null;
}
