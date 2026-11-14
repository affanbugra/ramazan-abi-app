import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, TextField } from '@/components/ui';
import { deleteStockItem, newStockItemId, saveStockItem, STOCK_GROUPS } from '@/features/stock/api';
import type { StockGroup, StockItemDoc, WithId } from '@/types/models';
import { isValidName, normalizeName } from '@/utils/format';
import { colors, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

interface StockItemSheetProps {
  ref: React.Ref<BottomSheetModal>;
  /** null = yeni malzeme */
  item: WithId<StockItemDoc> | null;
  defaultGroup: StockGroup;
  nextOrder: number;
  uid: string;
  onDone: () => void;
}

function Backdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />;
}

/** Malzeme formu: sadece ad ve grup (kantinci isteği; birim/miktar yok). */
export function StockItemSheet({ ref, item, defaultGroup, nextOrder, uid, onDone }: StockItemSheetProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [group, setGroup] = useState<StockGroup>(defaultGroup);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(item?.name ?? '');
    setGroup(item?.group ?? defaultGroup);
    setError(null);
  }, [item, defaultGroup]);

  const handleSave = async () => {
    if (saving) return;
    const clean = normalizeName(name);
    if (!isValidName(clean)) {
      setError('Malzemenin adını yaz.');
      return;
    }
    setSaving(true);
    try {
      await saveStockItem(
        item?.id ?? newStockItemId(),
        { name: clean, group, level: item?.level ?? 0, order: item?.order ?? nextOrder },
        uid,
      );
      onDone();
    } catch {
      Alert.alert('Kaydedilemedi', 'İnternet bağlantını kontrol edip tekrar dene.');
    }
    setSaving(false);
  };

  const handleDelete = () => {
    if (!item) return;
    Alert.alert('Malzeme silinsin mi?', `${item.name} stok listesinden kalkacak.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStockItem(item.id);
            onDone();
          } catch {
            Alert.alert('Silinemedi', 'İnternet bağlantını kontrol edip tekrar dene.');
          }
        },
      },
    ]);
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
        <Text style={[text.displayM, styles.title]}>{item ? 'Malzemeyi düzenle' : 'Yeni malzeme'}</Text>
        <TextField
          label="Malzeme adı"
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (error) setError(null);
          }}
          error={error}
          placeholder="Kaşar"
          maxLength={40}
          InputComponent={BottomSheetTextInput}
        />
        <Text style={styles.fieldLabel}>Grup</Text>
        <View style={styles.groups}>
          {STOCK_GROUPS.map((g) => (
            <Chip key={g.key} label={g.label} selected={g.key === group} onPress={() => setGroup(g.key)} />
          ))}
        </View>
        <Button title="Kaydet" loading={saving} onPress={handleSave} style={styles.save} />
        {item ? <Button title="Malzemeyi sil" variant="text" destructive onPress={handleDelete} /> : null}
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
  title: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...text.bodyMedium,
    fontSize: text.small.fontSize,
    marginBottom: spacing.xs,
  },
  groups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  save: {
    marginBottom: spacing.xs,
  },
});
