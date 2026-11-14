import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { QuantityStepper } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { updateShopSettings, useShopSettings } from '@/features/menu/api';
import { colors, layout, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

export default function ShopSettingsScreen() {
  const shop = useShopSettings();
  const session = useSession((s) => s.session);
  const uid = session.status === 'signedIn' ? session.profile.id : null;

  const setLimit = (value: number) => {
    if (!uid) return;
    updateShopSettings(uid, { maxActiveOrders: value }).catch(() =>
      Alert.alert('Kaydedilemedi', 'İnternet bağlantını kontrol edip tekrar dene.'),
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[text.displayL, styles.title]} accessibilityRole="header">
        Kantin ayarları
      </Text>
      {!shop.data ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <View style={styles.row}>
          <View style={styles.texts}>
            <Text style={text.bodyMedium}>Kişi başı açık sipariş</Text>
            <Text style={text.small}>Bir öğrenci aynı anda en fazla bu kadar açık sipariş verebilir.</Text>
          </View>
          <QuantityStepper value={shop.data.maxActiveOrders} onChange={setLimit} min={1} max={5} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
  },
  title: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  texts: {
    flex: 1,
  },
});
