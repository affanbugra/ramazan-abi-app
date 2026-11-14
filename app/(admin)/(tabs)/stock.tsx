import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { ArrowsDownUp, CaretDown, CaretRight, Plus } from 'phosphor-react-native';
import { StockBar } from '@/components/ui';
import { TabScreen } from '@/components/navigation/TabScreen';
import { useSession } from '@/features/auth/session';
import { isLow, setLevel, STOCK_GROUPS, useStockItems } from '@/features/stock/api';
import { StockItemSheet } from '@/features/stock/StockItemSheet';
import type { StockGroup, StockItemDoc, WithId } from '@/types/models';
import { colors, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

const COLLAPSED_KEY = 'stock-collapsed-groups-v1';
const showWriteError = () => Alert.alert('Kaydedilemedi', 'İnternet bağlantını kontrol edip tekrar dene.');

/** Kapatılan gruplar uygulama kapanıp açılınca da kapalı kalır. */
function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState<Set<StockGroup>>(new Set());
  useEffect(() => {
    AsyncStorage.getItem(COLLAPSED_KEY)
      .then((raw) => raw && setCollapsed(new Set(JSON.parse(raw) as StockGroup[])))
      .catch(() => undefined);
  }, []);
  const toggle = (g: StockGroup) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      AsyncStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next])).catch(() => undefined);
      return next;
    });
  return { collapsed, toggle };
}

function StockRow({ item, uid, onEdit }: { item: WithId<StockItemDoc>; uid: string; onEdit: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onEdit} style={styles.name} accessibilityRole="button" accessibilityLabel={`${item.name} düzenle`}>
        <Text style={[text.bodyMedium, isLow(item) && styles.lowText]} numberOfLines={1}>
          {item.name}
        </Text>
      </Pressable>
      <StockBar level={item.level} label={`${item.name} doluluk`} onCommit={(v) => setLevel(item.id, v, uid).catch(showWriteError)} />
    </View>
  );
}

export default function StockScreen() {
  const { items, loading, error } = useStockItems();
  const session = useSession((s) => s.session);
  const uid = session.status === 'signedIn' ? session.profile.id : '';
  const sheetRef = useRef<BottomSheetModal>(null);
  const [editing, setEditing] = useState<WithId<StockItemDoc> | null>(null);
  const [newGroup, setNewGroup] = useState<StockGroup>('ekmek');
  const { collapsed, toggle } = useCollapsedGroups();

  const nextOrder = Math.max(0, ...items.map((i) => i.order)) + 1;

  const openSheet = (item: WithId<StockItemDoc> | null, group: StockGroup = 'ekmek') => {
    setEditing(item);
    setNewGroup(group);
    sheetRef.current?.present();
  };

  return (
    <View style={styles.flex}>
      <TabScreen title="Stok">
        {loading ? (
          <ActivityIndicator color={colors.ink} style={styles.status} />
        ) : error ? (
          <Text style={[text.error, styles.status]}>Stok yüklenemedi. İnternet bağlantını kontrol et.</Text>
        ) : (
          <>
            {STOCK_GROUPS.map((g) => {
              const groupItems = items.filter((i) => (i.group ?? 'diger') === g.key);
              const open = !collapsed.has(g.key);
              const lowCount = groupItems.filter(isLow).length;
              return (
                <View key={g.key}>
                  <View style={styles.groupHeader}>
                    <Pressable
                      onPress={() => toggle(g.key)}
                      style={styles.groupToggle}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                      accessibilityLabel={`${g.label}, ${groupItems.length} malzeme`}
                    >
                      {open ? <CaretDown size={18} color={colors.ink} /> : <CaretRight size={18} color={colors.ink} />}
                      <Text style={text.displayM}>{g.label}</Text>
                      <Text style={text.small}>{groupItems.length}</Text>
                      {lowCount > 0 ? <Text style={[text.small, styles.lowText]}>{lowCount} az</Text> : null}
                    </Pressable>
                    {open && groupItems.length > 1 ? (
                      <Pressable
                        onPress={() => router.push({ pathname: '/(admin)/reorder', params: { type: 'stock', group: g.key } })}
                        hitSlop={8}
                        style={styles.iconButton}
                        accessibilityRole="button"
                        accessibilityLabel={`${g.label} sırala`}
                      >
                        <ArrowsDownUp size={20} color={colors.muted} />
                      </Pressable>
                    ) : null}
                    {open ? (
                      <Pressable
                        onPress={() => openSheet(null, g.key)}
                        hitSlop={8}
                        style={styles.iconButton}
                        accessibilityRole="button"
                        accessibilityLabel={`${g.label} grubuna malzeme ekle`}
                      >
                        <Plus size={20} color={colors.muted} />
                      </Pressable>
                    ) : null}
                  </View>
                  {open
                    ? groupItems.map((item) => <StockRow key={item.id} item={item} uid={uid} onEdit={() => openSheet(item)} />)
                    : null}
                </View>
              );
            })}
          </>
        )}
      </TabScreen>

      <StockItemSheet
        ref={sheetRef}
        item={editing}
        defaultGroup={newGroup}
        nextOrder={nextOrder}
        uid={uid}
        onDone={() => sheetRef.current?.dismiss()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  status: {
    padding: spacing.xl,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  groupToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 52,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    minHeight: 48,
  },
  name: {
    width: '38%',
    minHeight: 44,
    justifyContent: 'center',
  },
  lowText: {
    color: colors.alert,
  },
});
