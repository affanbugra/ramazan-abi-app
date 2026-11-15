// Zorunlu güncelleme: uygulamanın sürümü ve mağaza bağlantıları.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** app.json → "version" (build'e gömülür). */
export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

export const STORE_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/id6825644917'
    : 'https://play.google.com/store/apps/details?id=com.affanbugra.ramazanabi';

/** "1.10.0" ile "1.9.2" sayısal karşılaştırılır (functions/src/orderName.ts ile aynı kural). */
export function isVersionAtLeast(version: string, min: string): boolean {
  const a = version.split('.').map((n) => Number.parseInt(n, 10));
  const b = min.split('.').map((n) => Number.parseInt(n, 10));
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = Number.isFinite(a[i]) ? a[i] : 0;
    const y = Number.isFinite(b[i]) ? b[i] : 0;
    if (x !== y) return x > y;
  }
  return true;
}
