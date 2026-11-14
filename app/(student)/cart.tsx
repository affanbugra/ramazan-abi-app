import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ShoppingBag } from 'phosphor-react-native';
import { Button, EmptyState, QuantityStepper, TextField } from '@/components/ui';
import { cartTotal, MAX_QTY, useCart, type CartLine } from '@/features/cart/store';
import { useShopSettings } from '@/features/menu/api';
import { useSession } from '@/features/auth/session';
import { NotificationPrompt } from '@/features/notifications/NotificationPrompt';
import { newRequestId, placeOrder, type PlaceOrderError } from '@/features/orders/api';
import { shouldShowPrompt } from '@/lib/notifications';
import { formatPrice } from '@/utils/format';
import { colors, layout, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

const ORDER_NOTE_MAX = 200;

export default function CartScreen() {
  const lines = useCart((s) => s.lines);
  const note = useCart((s) => s.note);
  const setNote = useCart((s) => s.setNote);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const shop = useShopSettings();
  const shopOpen = shop.data?.isOpen ?? false;
  const session = useSession((s) => s.session);
  const uid = session.status === 'signedIn' ? session.profile.id : null;
  const [promptVisible, setPromptVisible] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<PlaceOrderError | null>(null);
  // Aynı sepet tekrar gönderilirse (ağ hatası sonrası yeniden deneme) aynı kimlik kullanılır
  const requestIdRef = useRef<{ id: string; signature: string } | null>(null);

  const total = cartTotal(lines);
  const signature = JSON.stringify([lines.map((l) => [l.key, l.qty]), note]);

  // İlk siparişten önce bildirim izni ön-ekranı (PROJE.md 6.3 / 9)
  const handleOrderPress = async () => {
    if (submitting || lines.length === 0) return;
    if (uid && (await shouldShowPrompt())) {
      setPromptVisible(true);
      return;
    }
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (submitting || lines.length === 0) return;
    if (!requestIdRef.current || requestIdRef.current.signature !== signature) {
      requestIdRef.current = { id: newRequestId(), signature };
    }
    setSubmitting(true);
    setError(null);
    const result = await placeOrder(requestIdRef.current.id, lines, note);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      clear();
      requestIdRef.current = null;
      router.replace({ pathname: '/(student)/order/[id]', params: { id: result.orderId } });
      return;
    }
    setSubmitting(false);
    setError(result.error);
  };

  const removeUnavailable = () => {
    if (error?.kind !== 'unavailable') return;
    lines
      .filter((l) => l.productId === error.productId && l.variantId === error.variantId)
      .forEach((l) => remove(l.key));
    setError(null);
  };

  if (lines.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <EmptyState
          icon={<ShoppingBag size={40} color={colors.teaDeep} />}
          title="Sepetin boş"
          description="Menüden bir şeyler ekleyince burada görünür."
          actionTitle="Menüye göz at"
          onAction={() => router.back()}
          style={styles.empty}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[text.displayL, styles.title]} accessibilityRole="header">
            Sepetim
          </Text>

          {lines.map((line, index) => (
            <CartRow
              key={line.key}
              line={line}
              first={index === 0}
              onQty={(q) => setQty(line.key, q)}
              onRemove={() => remove(line.key)}
            />
          ))}
          <Text style={[text.caption, styles.swipeHint]}>Silmek için satırı sola kaydırıp "Sil"e dokun ya da adedi sıfıra indir.</Text>

          <TextField
            label="Siparişe not"
            value={note}
            onChangeText={setNote}
            placeholder="Ör. ekmekler kızarmasın"
            maxLength={ORDER_NOTE_MAX}
            multiline
            containerStyle={styles.note}
          />
        </ScrollView>

        <View style={styles.footer}>
          {error ? (
            <View style={styles.error}>
              <Text style={text.error}>{error.message}</Text>
              {error.kind === 'unavailable' ? (
                <Button title="Sepetten çıkar" variant="text" destructive onPress={removeUnavailable} style={styles.errorAction} />
              ) : null}
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={text.bodyMedium}>Toplam</Text>
            <Text style={styles.total}>{formatPrice(total)}</Text>
          </View>
          {shopOpen ? (
            <Button title="Sipariş ver" loading={submitting} onPress={handleOrderPress} />
          ) : (
            <Text style={[text.body, styles.closed]}>Kantin şu an kapalı. Açılınca sipariş verebilirsin.</Text>
          )}
        </View>
      </KeyboardAvoidingView>
      {uid ? (
        <NotificationPrompt
          visible={promptVisible}
          uid={uid}
          role="student"
          onClose={() => {
            setPromptVisible(false);
            handleSubmit();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function CartRow({
  line,
  first,
  onQty,
  onRemove,
}: {
  line: CartLine;
  first: boolean;
  onQty: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable onPress={onRemove} style={styles.deleteAction} accessibilityRole="button" accessibilityLabel={`${line.productName} sil`}>
          <Text style={styles.deleteText}>Sil</Text>
        </Pressable>
      )}
    >
      <View style={[styles.row, !first && styles.rowDivider]}>
        <View style={styles.flex}>
          <Text style={text.bodyMedium}>{line.productName}</Text>
          {!line.singleVariant ? <Text style={text.small}>{line.variantName}</Text> : null}
          {line.note ? <Text style={[text.small, styles.lineNote]}>Not: {line.note}</Text> : null}
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.lineTotal}>{formatPrice(line.unitPrice * line.qty)}</Text>
          <QuantityStepper value={line.qty} onChange={onQty} min={0} max={MAX_QTY} minusLabel={line.qty === 1 ? 'Sil' : undefined} />
        </View>
      </View>
    </ReanimatedSwipeable>
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
  empty: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.lg,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
  },
  title: {
    paddingHorizontal: spacing.gutter,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
    backgroundColor: colors.ground,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  lineNote: {
    marginTop: spacing.xxs,
  },
  lineTotal: {
    fontFamily: text.bodyMedium.fontFamily,
    fontSize: text.bodyMedium.fontSize,
    color: colors.ink,
  },
  deleteAction: {
    backgroundColor: colors.alert,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
  },
  deleteText: {
    ...text.bodyMedium,
    color: colors.onTea,
  },
  swipeHint: {
    paddingHorizontal: spacing.gutter,
    marginTop: spacing.xs,
  },
  note: {
    paddingHorizontal: spacing.gutter,
    marginTop: spacing.lg,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
  },
  error: {
    gap: spacing.xxs,
  },
  errorAction: {
    alignSelf: 'flex-start',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  total: {
    fontFamily: text.displayM.fontFamily,
    fontSize: text.displayM.fontSize,
    color: colors.ink,
  },
  closed: {
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
