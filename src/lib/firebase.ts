import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getFirestore,
  type CollectionReference,
  type DocumentReference,
  type FirestoreDataConverter,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

// Yalnızca geliştirme: .env'de EXPO_PUBLIC_USE_EMULATORS=1 ise yerel emülatörlere bağlanır
const useEmulators = __DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS === '1';

// Emülatör modunda .env'deki gerçek proje değerleri yok sayılır (yanlışlıkla canlıya yazılmasın)
const firebaseConfig = useEmulators
  ? { apiKey: 'demo-key', projectId: 'demo-ramazan-abi', storageBucket: 'demo-ramazan-abi.appspot.com' }
  : {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Firebase ayarları eksik: .env.example dosyasını .env olarak kopyalayıp doldur.');
}

const isFirstInit = getApps().length === 0;
export const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// Oturum uygulama kapanınca silinmesin diye AsyncStorage kalıcılığı
function createAuth(): Auth {
  if (!isFirstInit) return getAuth(app);
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

export const auth = createAuth();
auth.languageCode = 'tr';

export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');
export const storage = getStorage(app);

if (useEmulators && isFirstInit) {
  // Simülatör bilgisayarın localhost'unu görür, Android emülatörü 10.0.2.2'yi.
  // Fiziksel cihazda Metro'nun çalıştığı bilgisayarın IP'si kullanılır (emülatörler 0.0.0.0'da dinlemeli).
  const host = Device.isDevice
    ? (Constants.expoConfig?.hostUri?.split(':')[0] ?? '127.0.0.1')
    : Platform.OS === 'android'
      ? '10.0.2.2'
      : '127.0.0.1';
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectFunctionsEmulator(functions, host, 5001);
  connectStorageEmulator(storage, host, 9199);
}

// Firestore verisini models.ts tipleriyle karşılamak için
function converter<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data) => data as T & object,
    fromFirestore: (snapshot, options) => snapshot.data(options) as T,
  };
}

export function typedDoc<T>(path: string): DocumentReference<T> {
  return doc(db, path).withConverter(converter<T>());
}

export function typedCollection<T>(path: string): CollectionReference<T> {
  return collection(db, path).withConverter(converter<T>());
}
