import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import dayjs from 'dayjs';
import { CaretLeft } from 'phosphor-react-native';
import { Button } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { cancelOrder, useOrder, useQueue } from '@/features/orders/api';
import { closedResultText } from '@/features/orders/format';
import { OrderChat } from '@/features/orders/OrderChat';
import type { OrderDoc, WithId } from '@/types/models';
import { formatPrice, formatTime } from '@/utils/format';
import { useNow } from '@/utils/useNow';
import { colors, layout, spacing, typography } from '@/theme/tokens';
import { text } from '@/theme/text';

type Tone = 'queue' | 'cooking' | 'ready' | 'closed';

const TONE = {
  queue: { bg: colors.teaSoft, fg: colors.teaDeep, sub: colors.teaDeep, bar: 'dark' as const },
  cooking: { bg: colors.tea, fg: colors.onTea, sub: colors.onTeaMuted, bar: 'light' as const },
  ready: { bg: colors.fresh, fg: colors.onTea, sub: colors.onTea, bar: 'light' as const },
  closed: { bg: colors.surface, fg: colors.ink, sub: colors.muted, bar: 'dark' as const },
};

function toneOf(order: OrderDoc): Tone {
  if (order.status === 'pending') return 'queue';
  if (order.status === 'preparing') return 'cooking';
  if (order.status === 'ready') return 'ready';
  return 'closed';
}

/** Durum alanının gövdesi: tek bir dev sayı ya da kelime, kantin menü panosu gibi. */
function HeroBody({ order, tone }: { order: WithId<OrderDoc>; tone: Tone }) {
  const t = TONE[tone];
  const now = useNow(15_000);
  const queue = useQueue();

  if (tone === 'queue') {
    const ahead = queue.data?.ids.indexOf(order.id) ?? -1;
    return (
      <View>
        <Text style={[styles.eyebrow, { color: t.sub }]}>Sıradasın</Text>
        {ahead > 0 ? (
          <View style={styles.numberRow}>
            <Text style={[styles.hero, { color: t.fg }]}>{ahead}</Text>
            <Text style={[styles.unit, { color: t.fg }]}>sipariş{'\n'}önünde</Text>
          </View>
        ) : (
          <Text style={[styles.heroWord, { color: t.fg }]}>{ahead === 0 ? 'Sıradaki sensin' : 'Siparişin alındı'}</Text>
        )}
        <Text style={[styles.sub, { color: t.sub }]}>Ramazan abi süre verince burada geri sayım başlar.</Text>
      </View>
    );
  }

  if (tone === 'cooking' && order.etaAt) {
    const eta = order.etaAt.toMillis();
    const minutes = Math.ceil((eta - now) / 60_000);
    return (
      <View>
        <Text style={[styles.eyebrow, { color: t.sub }]}>Ramazan abi hazırlıyor</Text>
        {minutes > 0 ? (
          <View style={styles.numberRow}>
            <Text style={[styles.hero, { color: t.fg }]}>{minutes}</Text>
            <Text style={[styles.unit, { color: t.fg }]}>dk</Text>
          </View>
        ) : (
          <Text style={[styles.heroWord, { color: t.fg }]}>Birazdan hazır</Text>
        )}
        <Text style={[styles.sub, { color: t.sub }]}>{dayjs(eta).format('HH:mm')} gibi hazır</Text>
      </View>
    );
  }

  if (tone === 'ready') {
    return (
      <View>
        <Text style={[styles.heroWord, styles.readyWord, { color: t.fg }]}>Hazır</Text>
        <Text style={[styles.sub, { color: t.sub }]}>Kantinden alabilirsin.</Text>
      </View>
    );
  }

  const failed = order.status === 'rejected' || order.status === 'no_show';
  return (
    <View>
      <Text style={[styles.eyebrow, { color: t.sub }]}>{order.closedAt ? `${formatTime(order.closedAt)}'de` : 'Kapandı'}</Text>
      <Text style={[text.displayL, { color: failed ? colors.alert : t.fg }]}>{closedResultText(order)}</Text>
    </View>
  );
}

/** Hazırlanırken alanın dibindeki ince süre çizgisi (kabul → tahmini hazır). */
function TimeLine({ order }: { order: WithId<OrderDoc> }) {
  const now = useNow(15_000);
  if (order.status !== 'preparing' || !order.etaAt) return null;
  const start = order.acceptedAt?.toMillis() ?? order.etaAt.toMillis();
  const end = order.etaAt.toMillis();
  const progress = end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 1;
  return (
    <View style={styles.lineTrack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.lineFill, { width: `${Math.round(progress * 100)}%` }]} />
    </View>
  );
}

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: order, loading } = useOrder(id ?? null);
  const session = useSession((s) => s.session);
  const uid = session.status === 'signedIn' ? session.profile.id : null;
  const [cancelling, setCancelling] = useState(false);

  const confirmCancel = () =>
    Alert.alert('Sipariş iptal edilsin mi?', 'Ramazan abi henüz hazırlamaya başlamadı.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: async () => {
          if (!order) return;
          setCancelling(true);
          try {
            await cancelOrder(order.id);
          } catch {
            // Bu arada hazırlanmaya başladıysa kural iptali reddeder
            Alert.alert('İptal edilemedi', 'Sipariş hazırlanmaya başlamış olabilir.');
          }
          setCancelling(false);
        },
      },
    ]);

  if (loading) return <ActivityIndicator color={colors.ink} style={[styles.loading, { marginTop: insets.top + spacing.xxl }]} />;
  if (!order) {
    return (
      <View style={styles.missing}>
        <Text style={text.body}>Sipariş bulunamadı.</Text>
        <Button title="Geri dön" variant="text" onPress={() => router.back()} />
      </View>
    );
  }

  const tone = toneOf(order);
  const t = TONE[tone];

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style={t.bar} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.heroArea, { backgroundColor: t.bg, paddingTop: insets.top + spacing.xs }]}>
          <View style={styles.column}>
            <View style={styles.heroTop}>
              <Pressable onPress={() => router.back()} hitSlop={8} style={styles.back} accessibilityRole="button" accessibilityLabel="Geri">
                <CaretLeft size={24} color={t.fg} weight="bold" />
              </Pressable>
              <Text style={[text.bodyMedium, { color: t.fg }]} accessibilityLabel={`Sipariş ${order.orderNo}`}>
                Sipariş #{order.orderNo}
              </Text>
            </View>
            <View style={styles.heroBody}>
              <HeroBody order={order} tone={tone} />
            </View>
          </View>
          <TimeLine order={order} />
        </View>

        <View style={[styles.column, styles.receipt]}>
          {order.items.map((item, index) => (
            <View key={`${item.productId}-${item.variantId}-${index}`} style={[styles.line, index > 0 && styles.divider]}>
              <Text style={styles.qty}>{item.qty}×</Text>
              <View style={styles.flex}>
                <Text style={text.bodyMedium}>{item.productName}</Text>
                {item.variantName !== 'Standart' ? <Text style={text.small}>{item.variantName}</Text> : null}
                {item.note ? <Text style={styles.note}>Not: {item.note}</Text> : null}
              </View>
              <Text style={styles.price}>{formatPrice(item.unitPrice * item.qty)}</Text>
            </View>
          ))}
          {order.note ? (
            <View style={[styles.line, styles.divider]}>
              <Text style={styles.qty} />
              <Text style={[styles.note, styles.flex]}>Sipariş notu: {order.note}</Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={[text.bodyMedium, styles.flex]}>Toplam</Text>
            <Text style={text.displayM}>{formatPrice(order.total)}</Text>
          </View>
          <Text style={[text.caption, styles.placedAt]}>{formatTime(order.createdAt)}'de verildi</Text>

          {uid ? <OrderChat order={order} viewerId={uid} viewer="user" /> : null}

          {order.status === 'pending' ? (
            <Button title="Siparişi iptal et" variant="text" destructive loading={cancelling} onPress={confirmCancel} style={styles.cancel} />
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const QTY_COL = 44;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  flex: {
    flex: 1,
  },
  loading: {
    alignSelf: 'center',
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  column: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.gutter,
  },
  heroArea: {
    paddingBottom: spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  back: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -spacing.xs,
  },
  heroBody: {
    marginTop: spacing.lg,
  },
  eyebrow: {
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.body,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  hero: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.sizes.hero,
    lineHeight: typography.display.sizes.hero * 1.02,
    letterSpacing: typography.display.letterSpacing,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.sizes.l,
    lineHeight: typography.display.sizes.l * 1.05,
    marginBottom: spacing.md,
  },
  heroWord: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.sizes.xl,
    letterSpacing: typography.display.letterSpacing,
    marginTop: spacing.xxs,
  },
  readyWord: {
    fontSize: typography.display.sizes.hero,
    lineHeight: typography.display.sizes.hero * 1.02,
  },
  sub: {
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.body,
    marginTop: spacing.xxs,
  },
  lineTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: colors.teaPressed,
  },
  lineFill: {
    height: '100%',
    backgroundColor: colors.onTea,
  },
  receipt: {
    paddingTop: spacing.md,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  qty: {
    width: QTY_COL,
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.sizes.m,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  note: {
    ...text.small,
    color: colors.teaDeep,
    marginTop: spacing.xxs,
  },
  price: {
    ...text.bodyMedium,
    fontVariant: ['tabular-nums'],
    marginLeft: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.ink,
  },
  placedAt: {
    marginTop: spacing.xs,
  },
  cancel: {
    marginTop: spacing.lg,
  },
});
