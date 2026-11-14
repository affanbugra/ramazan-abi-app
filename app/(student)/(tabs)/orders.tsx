import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Receipt } from 'phosphor-react-native';
import { Button, EmptyState, getOrderStatusConfig, StatusPill, Toast } from '@/components/ui';
import { TabScreen } from '@/components/navigation/TabScreen';
import { useSession } from '@/features/auth/session';
import { useCart } from '@/features/cart/store';
import { useProducts } from '@/features/menu/api';
import { isOpenOrder, linesForReorder, useMyOrders } from '@/features/orders/api';
import { orderSummary } from '@/features/orders/format';
import type { OrderDoc, WithId } from '@/types/models';
import { formatDateTime, formatPrice } from '@/utils/format';
import { colors, layout, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

function OrderRow({
  order,
  first,
  onReorder,
}: {
  order: WithId<OrderDoc>;
  first: boolean;
  onReorder?: () => void;
}) {
  const status = getOrderStatusConfig(order.status);
  return (
    <View style={[styles.rowWrap, !first && styles.rowDivider]}>
      <Pressable
        onPress={() => router.push({ pathname: '/(student)/order/[id]', params: { id: order.id } })}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Sipariş ${order.orderNo}, ${status.label}`}
      >
        <View style={styles.rowTop}>
          <Text style={text.displayM}>#{order.orderNo}</Text>
          {order.unreadForUser > 0 ? <View style={styles.unreadDot} accessibilityLabel="Okunmamış mesaj" /> : null}
          <View style={styles.flex} />
          <StatusPill label={status.label} variant={status.variant} />
        </View>
        <Text style={text.body} numberOfLines={2}>
          {orderSummary(order)}
        </Text>
        <Text style={text.small}>
          {formatDateTime(order.createdAt)}, {formatPrice(order.total)}
        </Text>
      </Pressable>
      {onReorder ? <Button title="Tekrar sipariş ver" variant="text" onPress={onReorder} style={styles.reorder} /> : null}
    </View>
  );
}

export default function OrdersScreen() {
  const session = useSession((s) => s.session);
  const uid = session.status === 'signedIn' ? session.profile.id : null;
  const { items: orders, loading, error } = useMyOrders(uid);
  const { items: products } = useProducts();
  const add = useCart((s) => s.add);
  const [toast, setToast] = useState<string | null>(null);

  const open = orders.filter(isOpenOrder);
  const history = orders.filter((o) => !isOpenOrder(o));

  const reorder = (order: WithId<OrderDoc>) => {
    const { lines, skipped } = linesForReorder(order, products);
    if (lines.length === 0) {
      setToast('Bu siparişteki ürünler artık yok ya da tükendi.');
      return;
    }
    lines.forEach((line) => add(line));
    if (skipped > 0) setToast(`${skipped} ürün artık yok ya da tükendi, onları ekleyemedik.`);
    router.push('/(student)/cart');
  };

  return (
    <View style={styles.flex}>
      <TabScreen title="Siparişlerim">
        <View style={styles.column}>
          {loading ? (
            <ActivityIndicator color={colors.ink} style={styles.status} />
          ) : error ? (
            <Text style={[text.error, styles.status]}>Siparişler yüklenemedi. İnternet bağlantını kontrol et.</Text>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<Receipt size={40} color={colors.teaDeep} />}
              title="Henüz siparişin yok"
              actionTitle="Menüye göz at"
              onAction={() => router.navigate('/(student)/(tabs)/menu')}
            />
          ) : (
            <>
              {open.length > 0 ? (
                <View style={styles.section}>
                  <Text style={[text.bodyMedium, styles.sectionTitle]}>Açık siparişler</Text>
                  <View style={styles.openGroup}>
                    {open.map((o, i) => (
                      <OrderRow key={o.id} order={o} first={i === 0} />
                    ))}
                  </View>
                </View>
              ) : null}
              {history.length > 0 ? (
                <View style={styles.section}>
                  <Text style={[text.bodyMedium, styles.sectionTitle]}>Geçmiş</Text>
                  {history.map((o, i) => (
                    <OrderRow key={o.id} order={o} first={i === 0} onReorder={() => reorder(o)} />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>
      </TabScreen>
      <Toast message={toast ?? ''} visible={toast !== null} onDismiss={() => setToast(null)} hapticType="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  column: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  status: {
    padding: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    paddingHorizontal: spacing.gutter,
    marginBottom: spacing.xs,
    color: colors.muted,
  },
  openGroup: {
    marginHorizontal: spacing.gutter,
    borderRadius: rounded.card,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  rowWrap: {
    paddingHorizontal: spacing.gutter,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  row: {
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  pressed: {
    opacity: 0.7,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: rounded.pill,
    backgroundColor: colors.tea,
  },
  reorder: {
    alignSelf: 'flex-start',
    marginLeft: -spacing.gutter,
    marginTop: -spacing.xs,
  },
});
