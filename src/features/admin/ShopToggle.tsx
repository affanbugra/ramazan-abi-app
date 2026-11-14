import React from 'react';
import { Alert } from 'react-native';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { useSession } from '@/features/auth/session';
import { updateShopSettings, useShopSettings } from '@/features/menu/api';
import { ShopStatusRow } from '@/features/menu/ShopStatusRow';
import { db } from '@/lib/firebase';

async function openOrderCount(): Promise<number> {
  const q = query(collection(db, 'orders'), where('status', 'in', ['pending', 'preparing', 'ready']));
  return (await getCountFromServer(q)).data().count;
}

/** Siparişler başlığının altındaki Açık / Namaz / Çay anahtarları. */
export function ShopControls() {
  const shop = useShopSettings();
  const session = useSession((s) => s.session);
  const uid = session.status === 'signedIn' ? session.profile.id : null;
  if (!shop.data || !uid) return null;
  const { isOpen, prayerBreak = false, teaReady = false } = shop.data;

  const write = (patch: Parameters<typeof updateShopSettings>[1]) =>
    updateShopSettings(uid, patch).catch(() =>
      Alert.alert('Kaydedilemedi', 'İnternet bağlantını kontrol edip tekrar dene.'),
    );

  // Kapatınca namaz ve çay da kapanır; ertesi gün açılışta yanlışlıkla "Çay var" görünmesin
  const close = () => write({ isOpen: false, prayerBreak: false, teaReady: false });

  const toggleShop = async () => {
    if (!isOpen) {
      write({ isOpen: true });
      return;
    }
    let count = -1;
    try {
      count = await openOrderCount();
    } catch {
      // sayılamazsa yine de onay sorulur
    }
    if (count === 0) {
      close();
      return;
    }
    Alert.alert(
      'Kantin kapatılsın mı?',
      count > 0 ? `${count} açık sipariş var. Kantini kapatsan da bunlar devam eder.` : 'Yeni sipariş alınmayacak.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Kapat', style: 'destructive', onPress: close },
      ],
    );
  };

  return (
    <ShopStatusRow
      shop={shop.data}
      onShopPress={toggleShop}
      onPrayerPress={() => write({ prayerBreak: !prayerBreak })}
      onTeaPress={() => write({ teaReady: !teaReady })}
    />
  );
}
