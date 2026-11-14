import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { DotsSixVertical } from 'phosphor-react-native';
import { saveOrder, useCategories, useProducts } from '@/features/menu/api';
import { STOCK_GROUPS, useStockItems } from '@/features/stock/api';
import { colors, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

interface Row {
  id: string;
  name: string;
}

/** Kategorileri, bir kategorinin ürünlerini ya da bir stok grubunu sürükle-bırak ile sıralar. */
export default function ReorderScreen() {
  const params = useLocalSearchParams<{ type: 'categories' | 'products' | 'stock'; categoryId?: string; group?: string }>();
  const kind = params.type ?? 'categories';
  const { items: categories } = useCategories();
  const { items: products } = useProducts();
  const { items: stock } = useStockItems();

  const source: Row[] =
    kind === 'categories'
      ? categories.map((c) => ({ id: c.id, name: c.name }))
      : kind === 'products'
        ? products.filter((p) => p.categoryId === params.categoryId).map((p) => ({ id: p.id, name: p.name }))
        : stock.filter((i) => i.group === params.group).map((i) => ({ id: i.id, name: i.name }));
  const sourceKey = source.map((r) => `${r.id}:${r.name}`).join(',');

  const [rows, setRows] = useState<Row[]>(source);
  // Sürükleme sırasında canlı veri listeyi ezmesin; sadece içerik gerçekten değişirse yenile
  useEffect(() => setRows(source), [sourceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const categoryName = categories.find((c) => c.id === params.categoryId)?.name;
  const groupName = STOCK_GROUPS.find((g) => g.key === params.group)?.label;
  const title =
    kind === 'categories' ? 'Kategorileri sırala' : kind === 'products' ? `${categoryName ?? 'Ürünleri'} sırala` : `${groupName ?? 'Stok'} sırala`;

  const handleDragEnd = ({ data }: { data: Row[] }) => {
    setRows(data);
    // Stokta yalnızca grubun kendi kalemleri yeniden numaralanır; gruplar ayrı gösterildiği için çakışmaz
    saveOrder(kind === 'categories' ? 'categories' : kind === 'products' ? 'products' : 'stockItems', data.map((r) => r.id)).catch(() =>
      Alert.alert('Sıra kaydedilemedi', 'İnternet bağlantını kontrol edip tekrar dene.'),
    );
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Row>) => (
    <Pressable
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        drag();
      }}
      delayLongPress={150}
      style={[styles.row, isActive && styles.rowActive]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, sıralamak için basılı tut ve sürükle`}
    >
      <Text style={[text.bodyMedium, styles.name]}>{item.name}</Text>
      <Pressable onPressIn={drag} hitSlop={12} accessibilityLabel={`${item.name} tutamağı`}>
        <DotsSixVertical size={24} color={colors.muted} />
      </Pressable>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <DraggableFlatList
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        activationDistance={8}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={text.displayL} accessibilityRole="header">
              {title}
            </Text>
            <Text style={[text.small, styles.hint]}>Sağdaki tutamaktan tutup sürükle. Sıra hemen kaydedilir.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  header: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.md,
  },
  hint: {
    marginTop: spacing.xxs,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    backgroundColor: colors.ground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  rowActive: {
    backgroundColor: colors.surface,
  },
  name: {
    flex: 1,
  },
});
