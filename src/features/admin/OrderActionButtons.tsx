import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Button, EtaButtons } from '@/components/ui';
import {
  acceptOrder,
  extendEta,
  markDelivered,
  markNoShow,
  markReady,
} from '@/features/admin/orderActions';
import type { OrderDoc, WithId } from '@/types/models';
import { colors, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

interface OrderActionsProps {
  order: WithId<OrderDoc>;
  now: number;
  onReject: (order: WithId<OrderDoc>) => void;
}

const showWriteError = () => Alert.alert('Kaydedilemedi', 'İnternet bağlantını kontrol edip tekrar dene.');

/** Duruma göre kart içi aksiyonlar (PROJE.md 7.1). */
export function OrderActions({ order, now, onReject }: OrderActionsProps) {
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await action();
    } catch {
      showWriteError();
    }
    setBusy(false);
  };

  if (order.status === 'pending') {
    return (
      <View style={styles.block}>
        <EtaButtons disabled={busy} onPick={(m) => run(() => acceptOrder(order.id, m))} />
        <Button title="Reddet" variant="text" destructive onPress={() => onReject(order)} style={styles.reject} />
      </View>
    );
  }

  if (order.status === 'preparing') {
    const eta = order.etaAt?.toMillis() ?? now;
    const minutesLeft = Math.ceil((eta - now) / 60_000);
    const lateBy = Math.floor((now - eta) / 60_000);
    return (
      <View style={styles.block}>
        <Text style={[styles.remaining, minutesLeft <= 0 && styles.late]}>
          {minutesLeft > 0 ? `~${minutesLeft} dk` : lateBy >= 1 ? `+${lateBy} dk gecikti` : 'Süre doldu'}
        </Text>
        <View style={styles.row}>
          <Button title="+5 dk" variant="secondary" loading={busy} onPress={() => run(() => extendEta(order))} style={styles.small} />
          <Button title="Hazır" loading={busy} onPress={() => run(() => markReady(order.id))} style={styles.flex} />
        </View>
        <Button title="Reddet" variant="text" destructive onPress={() => onReject(order)} style={styles.reject} />
      </View>
    );
  }

  if (order.status === 'ready') {
    const confirmNoShow = () =>
      Alert.alert('Gelmedi olarak işaretlensin mi?', `#${order.orderNo} ${order.userName}`, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Gelmedi', style: 'destructive', onPress: () => run(() => markNoShow(order.id)) },
      ]);
    return (
      <View style={[styles.block, styles.row]}>
        <Button title="Gelmedi" variant="secondary" onPress={confirmNoShow} style={styles.small} />
        <Button title="Teslim edildi" loading={busy} onPress={() => run(() => markDelivered(order.id))} style={styles.flex} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  block: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  small: {
    minWidth: 104,
  },
  reject: {
    alignSelf: 'flex-start',
    marginLeft: -spacing.gutter + spacing.xxs,
  },
  remaining: {
    ...text.displayM,
    color: colors.tea,
  },
  late: {
    color: colors.alert,
  },
});
