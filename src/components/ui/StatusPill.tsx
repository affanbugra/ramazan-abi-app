import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

export type OrderStatusType =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'no_show'
  | 'cancelled'
  | 'rejected';

export interface StatusPillProps {
  label: string;
  type?: 'shop' | 'order' | 'custom';
  variant?: 'fresh' | 'surface' | 'busy' | 'alert' | 'tea';
  style?: StyleProp<ViewStyle>;
}

/** Kantin durumu: Açık, Kapalı ya da Namazda (açık ama yeni sipariş alınmıyor). */
export function getShopStatusConfig(shop: { isOpen: boolean; prayerBreak?: boolean }): {
  label: string;
  variant: 'fresh' | 'alert' | 'busy';
} {
  if (!shop.isOpen) return { label: 'Kapalı', variant: 'alert' };
  return shop.prayerBreak ? { label: 'Namazda', variant: 'busy' } : { label: 'Açık', variant: 'fresh' };
}

export function getOrderStatusConfig(status: OrderStatusType): {
  label: string;
  variant: 'fresh' | 'surface' | 'busy' | 'alert' | 'tea';
} {
  switch (status) {
    case 'pending':
      return { label: 'Alındı', variant: 'surface' };
    case 'preparing':
      return { label: 'Hazırlanıyor', variant: 'tea' };
    case 'ready':
      return { label: 'Hazır', variant: 'fresh' };
    case 'delivered':
      return { label: 'Teslim edildi', variant: 'surface' };
    case 'cancelled':
      return { label: 'İptal edildi', variant: 'surface' };
    case 'rejected':
      return { label: 'Reddedildi', variant: 'alert' };
    case 'no_show':
      return { label: 'Gelmedi', variant: 'alert' };
  }
}

export const StatusPill: React.FC<StatusPillProps> = ({
  label,
  variant = 'surface',
  style,
}) => {
  return (
    <View style={[styles.base, styles[variant], style]}>
      <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={[styles.label, styles[`label_${variant}`]]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 32,
    borderRadius: rounded.pill,
    paddingHorizontal: spacing.sm,
    // Nokta yok: durum rengi metinle birlikte okunur (DESIGN.md)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.caption,
  },
  // Variant: fresh
  fresh: {
    backgroundColor: colors.freshSoft,
  },
  label_fresh: {
    color: colors.fresh,
  },
  // Variant: surface
  surface: {
    backgroundColor: colors.surface,
  },
  label_surface: {
    color: colors.ink,
  },
  // Variant: busy
  busy: {
    backgroundColor: colors.busySoft,
  },
  label_busy: {
    color: colors.busy,
  },
  // Variant: alert
  alert: {
    backgroundColor: colors.alertSoft,
  },
  label_alert: {
    color: colors.alert,
  },
  // Variant: tea
  tea: {
    backgroundColor: colors.teaSoft,
  },
  label_tea: {
    color: colors.teaDeep,
  },
});
