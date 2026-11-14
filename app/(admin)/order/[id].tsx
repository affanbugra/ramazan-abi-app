import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Button, getOrderStatusConfig, StatusPill } from '@/components/ui';
import { OrderActions } from '@/features/admin/OrderActionButtons';
import { RejectSheet } from '@/features/admin/RejectSheet';
import { useSession } from '@/features/auth/session';
import { useOrder } from '@/features/orders/api';
import { OrderChat } from '@/features/orders/OrderChat';
import { closedResultText, itemLabel } from '@/features/orders/format';
import { formatDateTime, formatPhone, formatPrice, formatTime } from '@/utils/format';
import { useNow } from '@/utils/useNow';
import { colors, layout, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, loading } = useOrder(id ?? null);
  const now = useNow(30_000);
  const rejectRef = useRef<BottomSheetModal>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const session = useSession((s) => s.session);
  const uid = session.status === 'signedIn' ? session.profile.id : null;

  if (loading) return <ActivityIndicator color={colors.ink} style={styles.loading} />;
  if (!order) {
    return (
      <View style={styles.missing}>
        <Text style={text.body}>Sipariş bulunamadı.</Text>
      </View>
    );
  }

  const status = getOrderStatusConfig(order.status);
  const result = closedResultText(order);
  const timeline: [string, string | null][] = [
    ['Alındı', formatTime(order.createdAt)],
    ['Süre verildi', order.acceptedAt ? `${formatTime(order.acceptedAt)}${order.etaMinutes ? `, ${order.etaMinutes} dk` : ''}` : null],
    ['Hazır', order.readyAt ? formatTime(order.readyAt) : null],
    ['Kapandı', order.closedAt ? formatTime(order.closedAt) : null],
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.headRow}>
            <Text style={text.displayXl} accessibilityRole="header">
              #{order.orderNo}
            </Text>
            <StatusPill label={status.label} variant={status.variant} />
          </View>
          <Text style={text.small}>{formatDateTime(order.createdAt)}</Text>

          <View style={styles.person}>
            <View style={styles.flex}>
              <Text style={text.bodyMedium}>{order.userName}</Text>
              {order.userPhone ? <Text style={text.small}>{formatPhone(order.userPhone)}</Text> : null}
            </View>
            {order.userPhone ? (
              <Button title="Ara" variant="secondary" onPress={() => Linking.openURL(`tel:${order.userPhone}`)} />
            ) : null}
          </View>

          {result ? <Text style={[text.displayM, styles.result]}>{result}</Text> : null}

          <OrderActions
            order={order}
            now={now}
            onReject={() => {
              setRejectOpen(true);
              rejectRef.current?.present();
            }}
          />

          <View style={styles.items}>
            {order.items.map((item, index) => (
              <View key={`${item.productId}-${item.variantId}-${index}`} style={[styles.itemRow, index > 0 && styles.divider]}>
                <View style={styles.flex}>
                  <Text style={text.bodyMedium}>
                    {item.qty}× {itemLabel(item)}
                  </Text>
                  {item.note ? (
                    <View style={styles.note}>
                      <Text style={styles.noteText}>{item.note}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={text.body}>{formatPrice(item.unitPrice * item.qty)}</Text>
              </View>
            ))}
            {order.note ? (
              <View style={[styles.note, styles.orderNote]}>
                <Text style={styles.noteText}>Sipariş notu: {order.note}</Text>
              </View>
            ) : null}
            <View style={[styles.itemRow, styles.divider]}>
              <Text style={[text.bodyMedium, styles.flex]}>Toplam</Text>
              <Text style={text.displayM}>{formatPrice(order.total)}</Text>
            </View>
          </View>

          <View style={styles.timeline}>
            {timeline
              .filter(([, value]) => value !== null)
              .map(([label, value]) => (
                <View key={label} style={styles.timelineRow}>
                  <Text style={[text.small, styles.flex]}>{label}</Text>
                  <Text style={[text.small, styles.timelineValue]}>{value}</Text>
                </View>
              ))}
          </View>

          {uid ? <OrderChat order={order} viewerId={uid} viewer="admin" /> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <RejectSheet
        ref={rejectRef}
        order={rejectOpen ? order : null}
        onDone={() => {
          rejectRef.current?.dismiss();
          setRejectOpen(false);
        }}
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
  loading: {
    marginTop: spacing.xxl,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
  },
  result: {
    marginTop: spacing.lg,
  },
  items: {
    marginTop: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  note: {
    alignSelf: 'flex-start',
    marginTop: spacing.xxs,
    backgroundColor: colors.teaSoft,
    borderRadius: rounded.button,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  noteText: {
    ...text.small,
    color: colors.teaDeep,
  },
  orderNote: {
    marginBottom: spacing.sm,
  },
  timeline: {
    marginTop: spacing.lg,
    gap: spacing.xxs,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineValue: {
    color: colors.ink,
  },
});
