// Firestore + Storage kural testleri (PROJE.md 10.4).
// Çalıştırma (functions/ içinde): npm run test:rules
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  Timestamp,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { deleteObject, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';

// lib/test/rules.test.js → App/
const ROOT = path.resolve(__dirname, '../../..');

let env: RulesTestEnvironment;

// assertFails'ın beklenen PERMISSION_DENIED loglarını gizle
setLogLevel('silent');

// rules-unit-testing compat tipinde döndürüyor; modular API ile aynı nesne
const fs = (ctx: RulesTestContext) => ctx.firestore() as unknown as Firestore;
const st = (ctx: RulesTestContext) => ctx.storage() as unknown as FirebaseStorage;

const student = () => env.authenticatedContext('student1');
const otherStudent = () => env.authenticatedContext('student2');
const suspended = () => env.authenticatedContext('suspended1');
const admin = () => env.authenticatedContext('admin1');

function userDoc(name: string, role: 'student' | 'admin', status: 'active' | 'suspended') {
  return {
    name,
    email: `${name.toLowerCase()}@test.com`,
    phone: '+905321234567',
    photoURL: null,
    role,
    status,
    inviteCode: null,
    pushTokens: [],
    orderCount: 0,
    noShowCount: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

function orderDoc(userId: string, status: string) {
  return {
    orderNo: 1,
    userId,
    userName: 'Ahmet',
    userPhone: null,
    items: [],
    note: null,
    total: 75,
    status,
    queuePos: Date.now(),
    etaMinutes: null,
    etaAt: null,
    rejectReason: null,
    cancelledBy: null,
    createdAt: Timestamp.now(),
    acceptedAt: null,
    readyAt: null,
    closedAt: null,
    updatedAt: Timestamp.now(),
    unreadForUser: 2,
    unreadForAdmin: 0,
    lastMessageAt: null,
    statsApplied: false,
  };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ramazan-abi',
    firestore: { rules: readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(path.join(ROOT, 'storage.rules'), 'utf8') },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = fs(ctx);
    await setDoc(doc(db, 'users/student1'), userDoc('Ahmet', 'student', 'active'));
    await setDoc(doc(db, 'users/student2'), userDoc('Mehmet', 'student', 'active'));
    await setDoc(doc(db, 'users/suspended1'), userDoc('Kemal', 'student', 'suspended'));
    await setDoc(doc(db, 'users/admin1'), userDoc('Ramazan', 'admin', 'active'));
    await setDoc(doc(db, 'products/tost'), { name: 'Tost', categoryId: 'tostlar' });
    await setDoc(doc(db, 'orders/o-pending'), orderDoc('student1', 'pending'));
    await setDoc(doc(db, 'orders/o-preparing'), orderDoc('student1', 'preparing'));
    await setDoc(doc(db, 'orders/o-other'), orderDoc('student2', 'pending'));
    await setDoc(doc(db, 'invites/X7K2PQ'), {
      code: 'X7K2PQ',
      label: 'Ahmet, oda 214',
      status: 'active',
      createdBy: 'admin1',
      createdByName: 'Ramazan',
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 3600_000),
      usedBy: null,
      usedByName: null,
      usedAt: null,
      revokedAt: null,
    });
  });
});

describe('siparişler', () => {
  it('öğrenci başkasının siparişini okuyamaz', async () => {
    await assertFails(getDoc(doc(fs(student()), 'orders/o-other')));
    await assertSucceeds(getDoc(doc(fs(student()), 'orders/o-pending')));
  });

  it('öğrenci sipariş listesini sadece userId filtresiyle sorgulayabilir', async () => {
    const db = fs(student());
    await assertSucceeds(getDocs(query(collection(db, 'orders'), where('userId', '==', 'student1'))));
    await assertFails(getDocs(collection(db, 'orders')));
  });

  it('öğrenci sipariş oluşturamaz (sadece function)', async () => {
    await assertFails(setDoc(doc(fs(student()), 'orders/yeni'), orderDoc('student1', 'pending')));
    await assertFails(addDoc(collection(fs(student()), 'orders'), orderDoc('student1', 'pending')));
  });

  it('öğrenci bekleyen siparişini iptal edebilir', async () => {
    await assertSucceeds(
      updateDoc(doc(fs(student()), 'orders/o-pending'), {
        status: 'cancelled',
        cancelledBy: 'user',
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('öğrenci hazırlanan siparişini iptal edemez', async () => {
    await assertFails(
      updateDoc(doc(fs(student()), 'orders/o-preparing'), {
        status: 'cancelled',
        cancelledBy: 'user',
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('öğrenci iptal ederken başka alan (ör. total) değiştiremez', async () => {
    await assertFails(
      updateDoc(doc(fs(student()), 'orders/o-pending'), {
        status: 'cancelled',
        cancelledBy: 'user',
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        total: 1,
      }),
    );
  });

  it('öğrenci okunmamış sayacını sadece sıfırlayabilir', async () => {
    await assertSucceeds(updateDoc(doc(fs(student()), 'orders/o-pending'), { unreadForUser: 0 }));
    await assertFails(updateDoc(doc(fs(student()), 'orders/o-pending'), { unreadForUser: 5 }));
  });
});

describe('mesajlar', () => {
  const message = (senderId: string, senderRole: 'user' | 'admin') => ({
    senderId,
    senderRole,
    text: 'Az acılı olsun',
    createdAt: serverTimestamp(),
  });

  it('öğrenci kendi açık siparişine mesaj yazabilir', async () => {
    await assertSucceeds(addDoc(collection(fs(student()), 'orders/o-pending/messages'), message('student1', 'user')));
  });

  it('öğrenci başkasının siparişine mesaj yazamaz', async () => {
    await assertFails(addDoc(collection(fs(student()), 'orders/o-other/messages'), message('student1', 'user')));
  });

  it('öğrenci kendini admin gibi gösteremez', async () => {
    await assertFails(addDoc(collection(fs(student()), 'orders/o-pending/messages'), message('student1', 'admin')));
  });

  it('admin herhangi bir açık siparişe mesaj yazabilir', async () => {
    await assertSucceeds(addDoc(collection(fs(admin()), 'orders/o-other/messages'), message('admin1', 'admin')));
  });
});

describe('kullanıcılar', () => {
  it('öğrenci kendi role alanını değiştiremez', async () => {
    await assertFails(updateDoc(doc(fs(student()), 'users/student1'), { role: 'admin' }));
    await assertFails(updateDoc(doc(fs(student()), 'users/student1'), { status: 'active', orderCount: 99 }));
  });

  it('öğrenci adını ve telefonunu değiştirebilir', async () => {
    await assertSucceeds(
      updateDoc(doc(fs(student()), 'users/student1'), { name: 'Ahmet Y.', phone: '+905320000000', updatedAt: serverTimestamp() }),
    );
  });

  it('öğrenci başkasının profilini okuyamaz', async () => {
    await assertFails(getDoc(doc(fs(student()), 'users/student2')));
  });

  it('kimse istemciden kullanıcı dokümanı oluşturamaz', async () => {
    const newcomer = env.authenticatedContext('newcomer');
    await assertFails(setDoc(doc(fs(newcomer), 'users/newcomer'), userDoc('Yeni', 'student', 'active')));
  });

  it('admin başka kullanıcıyı askıya alabilir ama admin yapamaz', async () => {
    await assertSucceeds(updateDoc(doc(fs(admin()), 'users/student1'), { status: 'suspended', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(fs(admin()), 'users/student2'), { role: 'admin' }));
    await assertFails(updateDoc(doc(fs(admin()), 'users/student2'), { status: 'deleted' }));
  });
});

describe('menü', () => {
  it('menü herkese açık: giriş yapmamış biri ve askıdaki öğrenci de okuyabilir (App Store 5.1.1(v))', async () => {
    await assertSucceeds(getDoc(doc(fs(env.unauthenticatedContext()), 'products/tost')));
    await assertSucceeds(getDocs(collection(fs(env.unauthenticatedContext()), 'categories')));
    await assertSucceeds(getDoc(doc(fs(suspended()), 'products/tost')));
    await assertSucceeds(getDoc(doc(fs(student()), 'products/tost')));
  });

  it('giriş yapmamış biri menüyü değiştiremez, sıraya ve siparişlere erişemez', async () => {
    const guest = fs(env.unauthenticatedContext());
    await assertFails(updateDoc(doc(guest, 'products/tost'), { name: 'Bedava tost' }));
    await assertFails(setDoc(doc(guest, 'categories/x'), { name: 'X', order: 1 }));
    await assertFails(getDoc(doc(guest, 'queue/current')));
    await assertFails(getDocs(collection(guest, 'orders')));
  });

  it('öğrenci menüyü değiştiremez', async () => {
    await assertFails(updateDoc(doc(fs(student()), 'products/tost'), { name: 'Bedava tost' }));
  });

  it('admin ürünü tükendi yapabilir, sıralayabilir ve yeni ürün ekleyebilir', async () => {
    const db = fs(admin());
    await assertSucceeds(updateDoc(doc(db, 'products/tost'), { available: false, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db, 'products/tost'), { order: 3 }));
    await assertSucceeds(setDoc(doc(db, 'products/yeni'), { name: 'Yeni', categoryId: 'tostlar', order: 9 }));
  });

  it('kantin ayarlarını sadece admin değiştirebilir', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(fs(ctx), 'settings/shop'), { isOpen: false, busyLevel: 'normal', maxActiveOrders: 2 });
    });
    await assertSucceeds(getDoc(doc(fs(student()), 'settings/shop')));
    await assertSucceeds(getDoc(doc(fs(env.unauthenticatedContext()), 'settings/shop')));
    await assertFails(getDoc(doc(fs(env.unauthenticatedContext()), 'settings/other')));
    await assertFails(updateDoc(doc(fs(env.unauthenticatedContext()), 'settings/shop'), { isOpen: true }));
    await assertFails(updateDoc(doc(fs(student()), 'settings/shop'), { isOpen: true }));
    await assertSucceeds(updateDoc(doc(fs(admin()), 'settings/shop'), { isOpen: true, busyLevel: 'busy' }));
  });

  it('öğrenci kategori ekleyemez', async () => {
    await assertFails(setDoc(doc(fs(student()), 'categories/x'), { name: 'X', order: 1 }));
  });
});

describe('stok', () => {
  it('stok listesini sadece admin görür ve değiştirir', async () => {
    await assertSucceeds(setDoc(doc(fs(admin()), 'stockItems/kasar'), { name: 'Kaşar', quantity: 2, max: 10 }));
    await assertSucceeds(updateDoc(doc(fs(admin()), 'stockItems/kasar'), { quantity: 10 }));
    await assertFails(getDoc(doc(fs(student()), 'stockItems/kasar')));
    await assertFails(updateDoc(doc(fs(student()), 'stockItems/kasar'), { quantity: 0 }));
  });
});

describe('davet kodları', () => {
  it('öğrenci davet kodlarını okuyamaz', async () => {
    await assertFails(getDoc(doc(fs(student()), 'invites/X7K2PQ')));
    await assertFails(getDoc(doc(fs(env.unauthenticatedContext()), 'invites/X7K2PQ')));
  });

  it('istemciden davet kodu oluşturulamaz (admin bile)', async () => {
    await assertFails(setDoc(doc(fs(admin()), 'invites/AAAAAA'), { code: 'AAAAAA', status: 'active' }));
  });

  it('admin aktif kodu iptal edebilir', async () => {
    await assertSucceeds(
      updateDoc(doc(fs(admin()), 'invites/X7K2PQ'), { status: 'revoked', revokedAt: serverTimestamp() }),
    );
  });

  it('admin kodu iptal dışında bir şeye çeviremez', async () => {
    await assertFails(updateDoc(doc(fs(admin()), 'invites/X7K2PQ'), { status: 'used' }));
    await assertFails(
      updateDoc(doc(fs(admin()), 'invites/X7K2PQ'), {
        status: 'revoked',
        revokedAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 999_999_999),
      }),
    );
  });
});

describe('storage', () => {
  const image = new Uint8Array([0xff, 0xd8, 0xff]);

  it('öğrenci menü fotoğrafı yükleyemez, admin yükleyebilir', async () => {
    await assertFails(uploadBytes(ref(st(student()), 'menu/products/tost_1.jpg'), image, { contentType: 'image/jpeg' }));
    await assertSucceeds(uploadBytes(ref(st(admin()), 'menu/products/tost_1.jpg'), image, { contentType: 'image/jpeg' }));
  });

  it('öğrenci sadece kendi avatar klasörüne yükleyebilir', async () => {
    await assertSucceeds(uploadBytes(ref(st(student()), 'avatars/student1/1.jpg'), image, { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(ref(st(otherStudent()), 'avatars/student1/2.jpg'), image, { contentType: 'image/jpeg' }));
  });

  it('menü fotoğrafını öğrenci silemez', async () => {
    await assertSucceeds(uploadBytes(ref(st(admin()), 'menu/categories/a.png'), image, { contentType: 'image/png' }));
    await assertFails(deleteObject(ref(st(student()), 'menu/categories/a.png')));
    await assertSucceeds(deleteObject(ref(st(admin()), 'menu/categories/a.png')));
  });

  it('resim olmayan dosya yüklenemez', async () => {
    await assertFails(uploadBytes(ref(st(student()), 'avatars/student1/x.pdf'), image, { contentType: 'application/pdf' }));
  });
});
