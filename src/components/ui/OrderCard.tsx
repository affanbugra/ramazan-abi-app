import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChatCircle } from 'phosphor-react-native';
import { Button } from './Button';
import { EtaButtons } from './EtaButtons';
import { getOrderStatusConfig, StatusPill } from './StatusPill';
import {
  acceptOrder,
  extendEta,
  markDelivered,
  markNoShow,
  markReady,
  READY_WAIT_WARN_MIN,
} from '@/features/admin/orderActions';
import { elapsedLabel, itemLabel } from '@/features/orders/format';
import type { OrderDoc, WithId } from '@/types/models';
import { colors, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

export interface OrderCardProps {
  order: WithId<OrderDoc>;
  now: number;
  highlighted: boolean;
  onPress: () => void;
}

// Panoda etiketler surface kart üzerinde ayrışsın diye: Yeni tea, Hazırlanıyor busy (turuncu), Hazır fresh
const PANO_PILL: Record<string, { label: string; variant: 'tea' | 'busy' | 'fresh' }> = {
  pending: { label: 'Yeni', variant: 'tea' },
  preparing: { label: 'Hazırlanıyor', variant: 'busy' },
  ready: { label: 'Hazır', variant: 'fresh' },
};

/**
 * Kantincinin pano kartı (DESIGN.md → Kantinci sipariş panosu): kompakt, 5-6 sipariş tek ekranda.
 * Reddetme kartta değil sipariş detayında (nadir kullanılan, yer kaplamasın).
 */
export const OrderCard: React.FC<OrderCardProps> = ({ order, now, highlighted, onPress }) => {
  const [busy, setBusy] = useState(false);
  const readyMinutes = order.status === 'ready' && order.readyAt ? Math.floor((now - order.readyAt.toMillis()) / 60_000) : 0;
  const waitingLong = order.status === 'ready' && readyMinutes >= READY_WAIT_WARN_MIN;
  const status = getOrderStatusConfig(order.status);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await action();
    } catch {
      Alert.alert('Kaydedilemedi', 'İnternet bağlantını kontrol edip tekrar dene.');
    }
    setBusy(false);
  };

  const notes = [...order.items.filter((i) => i.note).map((i) => `${i.productName}: ${i.note}`), ...(order.note ? [`Not: ${order.note}`] : [])];

  let actions: React.ReactNode = null;
  if (order.status === 'pending') {
    actions = (
      <View>
        <Text style={[text.caption, styles.etaLabel]}>Kaç dakikada hazır?</Text>
        <EtaButtons compact disabled={busy} onPick={(m) => run(() => acceptOrder(order.id, m))} />
      </View>
    );
  } else if (order.status === 'preparing') {
    const eta = order.etaAt?.toMillis() ?? now;
    const left = Math.ceil((eta - now) / 60_000);
    const late = Math.floor((now - eta) / 60_000);
    actions = (
      <View style={styles.row}>
        <Text style={[styles.remaining, left <= 0 && styles.late]} numberOfLines={1}>
          {left > 0 ? `~${left} dk` : late >= 1 ? `+${late} dk` : 'Süre doldu'}
        </Text>
        <Button title="+5 dk" variant="secondary" onPress={() => run(() => extendEta(order))} style={styles.small} />
        <Button title="Hazır" loading={busy} onPress={() => run(() => markReady(order.id))} style={styles.flex} />
      </View>
    );
  } else if (order.status === 'ready') {
    const confirmNoShow = () =>
      Alert.alert('Gelmedi olarak işaretlensin mi?', `#${order.orderNo} ${order.userName}`, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Gelmedi', style: 'destructive', onPress: () => run(() => markNoShow(order.id)) },
      ]);
    actions = (
      <View style={styles.row}>
        <Button title="Gelmedi" variant="secondary" onPress={confirmNoShow} style={styles.small} />
        <Button title="Teslim edildi" loading={busy} onPress={() => run(() => markDelivered(order.id))} style={styles.flex} />
      </View>
    );
  }

  return (
    <View style={[styles.card, highlighted && styles.highlighted, waitingLong && styles.waiting]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Sipariş ${order.orderNo}, ${order.userName}, ayrıntılar`}>
        <View style={styles.header}>
          <Text style={text.displayM}>#{order.orderNo}</Text>
          <Text style={[text.bodyMedium, styles.flex]} numberOfLines={1}>
            {order.userName}
          </Text>
          <StatusPill label={PANO_PILL[order.status]?.label ?? status.label} variant={PANO_PILL[order.status]?.variant ?? status.variant} />
        </View>
        <View style={styles.itemsRow}>
          <Text style={[text.body, styles.flex]} numberOfLines={2}>
            {order.items.map((i) => `${i.qty}× ${itemLabel(i)}`).join(', ')}
          </Text>
          <Text style={text.small}>{elapsedLabel(order.createdAt.toMillis(), now)}</Text>
        </View>
        {notes.length > 0 ? (
          <View style={styles.notes}>
            {notes.map((n, i) => (
              <View key={i} style={styles.note}>
                <Text style={styles.noteText} numberOfLines={2}>
                  {n}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {order.unreadForAdmin > 0 || waitingLong ? (
          <View style={styles.meta}>
            {order.unreadForAdmin > 0 ? (
              <View style={styles.metaItem}>
                <ChatCircle size={16} color={colors.tea} />
                <Text style={[text.small, styles.unread]}>{order.unreadForAdmin} yeni mesaj</Text>
              </View>
            ) : null}
            {waitingLong ? <Text style={[text.small, styles.waitingText]}>{readyMinutes} dk'dır bekliyor</Text> : null}
          </View>
        ) : null}
      </Pressable>
      <View style={styles.actions}>{actions}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: spacing.sm,
  },
  highlighted: {
    backgroundColor: colors.teaSoft,
  },
  waiting: {
    backgroundColor: colors.busySoft,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  notes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  note: {
    backgroundColor: colors.teaSoft,
    borderRadius: rounded.button,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  noteText: {
    ...text.small,
    color: colors.teaDeep,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  unread: {
    color: colors.tea,
  },
  waitingText: {
    color: colors.busy,
  },
  actions: {
    marginTop: spacing.sm,
  },
  etaLabel: {
    marginBottom: spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  small: {
    minWidth: 96,
    paddingHorizontal: spacing.sm,
  },
  remaining: {
    ...text.displayM,
    color: colors.tea,
    minWidth: 72,
  },
  late: {
    color: colors.alert,
  },
});
