import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CaretDown, CaretUp, Receipt } from 'phosphor-react-native';
import { EmptyState, getOrderStatusConfig, OrderCard, StatusPill } from '@/components/ui';
import { ShopControls } from '@/features/admin/ShopToggle';
import { useBoardOrders, useClosedToday } from '@/features/admin/orderActions';
import type { OrderDoc, WithId } from '@/types/models';
import { formatTime } from '@/utils/format';
import { useNow } from '@/utils/useNow';
import { colors, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

const HIGHLIGHT_MS = 2500;

/** Pano: bütün açık siparişler tek listede, geliş sırasıyla (kullanıcı kararı; sekme ve sürükleme yok). */
export default function AdminOrdersScreen() {
  const now = useNow(30_000);
  const { items, loading, error } = useBoardOrders();
  const closed = useClosedToday();
  const [showClosed, setShowClosed] = useState(false);
  const orders = [...items].sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());

  // Yeni sipariş gelince titreşim + kartın kısa vurgusu (uygulama açıkken)
  const seen = useRef<Set<string> | null>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (loading) return;
    const pendingIds = items.filter((o) => o.status === 'pending').map((o) => o.id);
    if (seen.current === null) {
      seen.current = new Set(pendingIds);
      return;
    }
    const fresh = pendingIds.filter((id) => !seen.current?.has(id));
    fresh.forEach((id) => seen.current?.add(id));
    if (fresh.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setHighlighted((h) => new Set([...h, ...fresh]));
    const timer = setTimeout(
      () => setHighlighted((h) => new Set([...h].filter((id) => !fresh.includes(id)))),
      HIGHLIGHT_MS,
    );
    return () => clearTimeout(timer);
  }, [items, loading]);

  const openDetail = (order: WithId<OrderDoc>) =>
    router.push({ pathname: '/(admin)/order/[id]', params: { id: order.id } });

  const header = (
    <View style={styles.header}>
      <Text style={text.displayL} accessibilityRole="header">
        Siparişler
      </Text>
      <ShopControls />
    </View>
  );

  const footer = (
    <View style={styles.closedSection}>
      <Pressable
        onPress={() => setShowClosed((v) => !v)}
        style={styles.closedHeader}
        accessibilityRole="button"
        accessibilityState={{ expanded: showClosed }}
      >
        <Text style={[text.bodyMedium, styles.flex]}>Bugün kapananlar ({closed.items.length})</Text>
        {showClosed ? <CaretUp size={20} color={colors.ink} /> : <CaretDown size={20} color={colors.ink} />}
      </Pressable>
      {showClosed
        ? closed.items.map((o) => {
            const status = getOrderStatusConfig(o.status);
            return (
              <Pressable key={o.id} onPress={() => openDetail(o)} style={styles.closedRow} accessibilityRole="button">
                <Text style={text.bodyMedium}>#{o.orderNo}</Text>
                <Text style={[text.body, styles.flex]} numberOfLines={1}>
                  {o.userName}
                </Text>
                <Text style={text.small}>{o.closedAt ? formatTime(o.closedAt) : ''}</Text>
                <StatusPill label={status.label} variant={status.variant} />
              </Pressable>
            );
          })
        : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={loading || error ? [] : orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.ink} style={styles.status} />
          ) : error ? (
            <Text style={[text.error, styles.status]}>Siparişler yüklenemedi. İnternet bağlantını kontrol et.</Text>
          ) : (
            <EmptyState icon={<Receipt size={40} color={colors.teaDeep} />} title="Açık sipariş yok" />
          )
        }
        renderItem={({ item }) => (
          <OrderCard order={item} now={now} highlighted={highlighted.has(item.id)} onPress={() => openDetail(item)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
  status: {
    padding: spacing.xl,
  },
  closedSection: {
    marginTop: spacing.xl,
  },
  closedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  closedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
});
