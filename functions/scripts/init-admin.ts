// Script'ler için firebase-admin başlatma.
// Gerçek proje: functions/service-account.json (gitignore'da) kullanılır.
// Emülatör: FIRESTORE_EMULATOR_HOST tanımlıysa anahtar gerekmez.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app';

// lib/scripts/*.js → functions/service-account.json
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../../service-account.json');

export function initAdmin(): void {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-ramazan-abi' });
    console.log(`Emülatöre bağlanıldı (${process.env.FIRESTORE_EMULATOR_HOST})`);
    return;
  }
  if (!existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(
      'functions/service-account.json bulunamadı.\n' +
        'Firebase Console → Proje ayarları → Hizmet hesapları → "Yeni özel anahtar oluştur" ile indirip bu adla kaydet.',
    );
    process.exit(1);
  }
  const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')) as ServiceAccount;
  initializeApp({ credential: cert(serviceAccount) });
}
