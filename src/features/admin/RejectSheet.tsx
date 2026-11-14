import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, TextField } from '@/components/ui';
import { REJECT_REASONS, rejectOrder } from '@/features/admin/orderActions';
import type { OrderDoc, WithId } from '@/types/models';
import { colors, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

interface RejectSheetProps {
  ref: React.Ref<BottomSheetModal>;
  order: WithId<OrderDoc> | null;
  onDone: () => void;
}

const REASON_MAX = 140;

function Backdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />;
}

/** Reddetme: hızlı sebepler ya da serbest metin (PROJE.md 7.1). */
export function RejectSheet({ ref, order, onDone }: RejectSheetProps) {
  const insets = useSafeAreaInsets();
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setCustom(''), [order?.id]);

  const submit = async (reason: string) => {
    if (!order || busy) return;
    setBusy(true);
    try {
      await rejectOrder(order.id, reason);
      onDone();
    } catch {
      Alert.alert('Kaydedilemedi', 'İnternet bağlantını kontrol edip tekrar dene.');
    }
    setBusy(false);
  };

  return (
    <BottomSheetModal
      ref={ref}
      backdropComponent={Backdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={text.displayM}>{order ? `#${order.orderNo} reddedilsin mi?` : 'Reddet'}</Text>
        <Text style={[text.small, styles.hint]}>Sebep öğrenciye gösterilir.</Text>
        <View style={styles.reasons}>
          {REJECT_REASONS.map((reason) => (
            <Button key={reason} title={reason} variant="secondary" onPress={() => submit(reason)} />
          ))}
        </View>
        <TextField
          label="Başka bir sebep"
          value={custom}
          onChangeText={setCustom}
          placeholder="Ör. Ocak arızalandı"
          maxLength={REASON_MAX}
          InputComponent={BottomSheetTextInput}
        />
        <Button
          title="Bu sebeple reddet"
          variant="text"
          destructive
          loading={busy}
          onPress={() => custom.trim() && submit(custom.trim())}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.ground,
    borderTopLeftRadius: rounded.sheet,
    borderTopRightRadius: rounded.sheet,
  },
  handle: {
    backgroundColor: colors.hairline,
  },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xs,
  },
  hint: {
    marginBottom: spacing.md,
  },
  reasons: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
});
