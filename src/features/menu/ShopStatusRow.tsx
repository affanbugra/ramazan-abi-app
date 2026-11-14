import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusToggle } from '@/components/ui';
import type { ShopSettings } from '@/types/models';
import { spacing } from '@/theme/tokens';

interface ShopStatusRowProps {
  shop: Pick<ShopSettings, 'isOpen' | 'prayerBreak' | 'teaReady'>;
  /** Verilmezse salt gösterge (öğrenci menüsü); kantinci panosunda anahtar olur */
  onShopPress?: () => void;
  onPrayerPress?: () => void;
  onTeaPress?: () => void;
}

/**
 * Kantinci panosunda üç anahtar (Açık / Namaz / Çay). Öğrenci menüsünde aynı görünümde iki gösterge:
 * kantin (namaz arasında sarı "Namazda") ve çay.
 */
export function ShopStatusRow({ shop, onShopPress, onPrayerPress, onTeaPress }: ShopStatusRowProps) {
  const open = shop.isOpen;
  const prayer = open && !!shop.prayerBreak;
  const tea = open && !!shop.teaReady;

  if (!onShopPress) {
    return (
      <View style={styles.compactRow}>
        <StatusToggle
          compact
          label={prayer ? 'Namazda' : open ? 'Kantin Açık' : 'Kantin Kapalı'}
          on={open}
          onTone={prayer ? 'busy' : 'fresh'}
          offTone="alert"
          accessibilityLabel={
            prayer ? 'Ramazan abi namazda, şu an sipariş alınmıyor' : open ? 'Kantin açık' : 'Kantin kapalı'
          }
        />
        <StatusToggle
          compact
          label={tea ? 'Çay Var' : 'Çay Yok'}
          on={tea}
          onTone="fresh"
          offTone="neutral"
          dimmed={!open}
          accessibilityLabel={tea ? 'Çay var' : 'Çay yok'}
        />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <StatusToggle
        label={open ? 'Açık' : 'Kapalı'}
        on={open}
        onTone="fresh"
        offTone="alert"
        onPress={onShopPress}
        accessibilityLabel={open ? 'Kantin açık' : 'Kantin kapalı'}
      />
      <StatusToggle
        label="Namaz"
        on={prayer}
        onTone="busy"
        offTone="neutral"
        dimmed={!open}
        onPress={open ? onPrayerPress : undefined}
        accessibilityLabel={prayer ? 'Ramazan abi namazda, sipariş alınmıyor' : 'Ramazan abi namazda değil'}
      />
      <StatusToggle
        label="Çay"
        on={tea}
        onTone="fresh"
        offTone="neutral"
        dimmed={!open}
        onPress={open ? onTeaPress : undefined}
        accessibilityLabel={tea ? 'Çay var' : 'Çay yok'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  compactRow: {
    flexDirection: 'row',
    flexShrink: 1,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
});
