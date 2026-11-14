// Canlıya geçmeden önce deneme verisini temizler.
// Kullanım (functions/ içinde):
//   npm run reset-data            → sadece listeler, hiçbir şey silmez
//   npm run reset-data -- --apply → listelenenleri siler
// Kalanlar: KEEP_EMAILS hesapları, menü (kategori/ürün/fotoğraf), stok, kantin ayarları.
// Silinenler: diğer hesaplar (Auth + profil + avatar), tüm siparişler ve mesajları, sıra, günlük
// istatistikler, sipariş sayaçları, davet kodları. Kalan hesapların sipariş sayaçları sıfırlanır.
// Repoda olmayan kişisel e-postalar (ör. kantincinin) functions/keep-emails.local.json'dan okunur
// (gitignore'da; içerik: ["ad@ornek.com"]). Dosya yoksa script çalışmaz.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { initAdmin } from './init-admin';

// lib/scripts/*.js → functions/keep-emails.local.json
const LOCAL_KEEP_PATH = path.resolve(__dirname, '../../keep-emails.local.json');
if (!existsSync(LOCAL_KEEP_PATH)) {
  console.error('functions/keep-emails.local.json bulunamadı (korunacak kişisel hesaplar). Oluşturmadan çalıştırma.');
  process.exit(1);
}
const LOCAL_KEEP_EMAILS = JSON.parse(readFileSync(LOCAL_KEEP_PATH, 'utf8')) as string[];

const KEEP_EMAILS = new Set([
  'affanbugraozaytas@gmail.com', // Affan (yönetici)
  ...LOCAL_KEEP_EMAILS.map((e) => e.toLowerCase()), // Ramazan abi (yönetici)
  'affanbugraozaytas+demoogrenci@gmail.com', // mağaza incelemesi
  'affanbugraozaytas+demoyonetici@gmail.com', // mağaza incelemesi
]);

// Emülatörde demo projenin bucket'ı kullanılır
const BUCKET = process.env.FIREBASE_STORAGE_EMULATOR_HOST
  ? `${process.env.GCLOUD_PROJECT ?? 'demo-ramazan-abi'}.appspot.com`
  : 'ramazan-abi-001.firebasestorage.app';

const WIPE_COLLECTIONS = ['orders', 'queue', 'dailyStats', 'counters', 'invites'];

async function listAllUsers(): Promise<UserRecord[]> {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false } } });
  const apply = values.apply ?? false;
  initAdmin();
  const db = getFirestore();
  const bucket = getStorage().bucket(BUCKET);

  const authUsers = await listAllUsers();
  const kept = authUsers.filter((u) => u.email && KEEP_EMAILS.has(u.email.toLowerCase()));
  const keptIds = new Set(kept.map((u) => u.uid));
  const removedAuth = authUsers.filter((u) => !keptIds.has(u.uid));
  const profiles = await db.collection('users').get();
  const removedProfiles = profiles.docs.filter((d) => !keptIds.has(d.id));

  console.log(`Kalacak hesaplar (${kept.length}):`);
  for (const u of kept) console.log(`  ${u.email}`);
  const missing = [...KEEP_EMAILS].filter((e) => !kept.some((u) => u.email?.toLowerCase() === e));
  if (missing.length > 0) console.log(`  (bulunamadı: ${missing.join(', ')})`);

  console.log(`\nSilinecek hesaplar (${removedAuth.length}):`);
  for (const u of removedAuth) console.log(`  ${u.email ?? u.uid}`);
  const orphanProfiles = removedProfiles.filter((d) => !removedAuth.some((u) => u.uid === d.id));
  for (const d of orphanProfiles) console.log(`  (girişi olmayan profil) ${String(d.get('name'))} ${d.id}`);

  console.log('\nTamamen boşaltılacak koleksiyonlar:');
  for (const name of WIPE_COLLECTIONS) {
    const count = (await db.collection(name).count().get()).data().count;
    console.log(`  ${name}: ${count} doküman${name === 'orders' ? ' (mesajlarıyla birlikte)' : ''}`);
  }
  console.log('\nKalan hesapların sipariş ve gelmedi sayaçları sıfırlanacak.');

  if (kept.length === 0) {
    console.error('\nKalacak hesap bulunamadı, güvenlik için durduruldu.');
    process.exit(1);
  }
  if (!apply) {
    console.log('\nHiçbir şey silinmedi. Silmek için: npm run reset-data -- --apply');
    return;
  }

  for (const name of WIPE_COLLECTIONS) await db.recursiveDelete(db.collection(name));
  for (const d of removedProfiles) {
    await db.recursiveDelete(d.ref);
    await bucket.deleteFiles({ prefix: `avatars/${d.id}/` }).catch(() => undefined);
  }
  for (const u of removedAuth) {
    await bucket.deleteFiles({ prefix: `avatars/${u.uid}/` }).catch(() => undefined);
  }
  if (removedAuth.length > 0) {
    const result = await getAuth().deleteUsers(removedAuth.map((u) => u.uid));
    for (const e of result.errors) console.error(`  silinemedi: ${removedAuth[e.index]?.email} (${e.error.message})`);
  }
  for (const u of kept) {
    const ref = db.doc(`users/${u.uid}`);
    if ((await ref.get()).exists) await ref.update({ orderCount: 0, noShowCount: 0 });
  }
  console.log('\nTemizlendi.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
