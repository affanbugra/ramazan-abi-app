import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Phone } from 'phosphor-react-native';
import dayjs from 'dayjs';
import { Avatar, Chip, SearchBar } from '@/components/ui';
import { TabScreen } from '@/components/navigation/TabScreen';
import { searchKey } from '@/features/menu/format';
import { setUserStatus, useStudents } from '@/features/people/api';
import type { UserDoc, UserStatus, WithId } from '@/types/models';
import { formatPhone } from '@/utils/format';
import { colors, layout, rounded, spacing, typography } from '@/theme/tokens';
import { text } from '@/theme/text';

function PersonRow({ user }: { user: WithId<UserDoc> }) {
  const suspended = user.status === 'suspended';

  const toggleStatus = () => {
    const next: UserStatus = suspended ? 'active' : 'suspended';
    Alert.alert(
      suspended ? `${user.name} aktifleştirilsin mi?` : `${user.name} askıya alınsın mı?`,
      suspended ? 'Tekrar sipariş verebilir.' : 'Hemen uygulamaya giremez ve sipariş veremez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: suspended ? 'Aktifleştir' : 'Askıya al',
          style: suspended ? 'default' : 'destructive',
          onPress: () =>
            setUserStatus(user.id, next).catch(() =>
              Alert.alert('Kaydedilemedi', 'İnternet bağlantını kontrol edip tekrar dene.'),
            ),
        },
      ],
    );
  };

  return (
    <View style={styles.row}>
      <Avatar name={user.name} photoURL={user.photoURL} size="sm" />
      <View style={styles.flex}>
        <Text style={text.bodyMedium} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={text.small}>{formatPhone(user.phone)}</Text>
        <Text style={text.caption} numberOfLines={1}>
          {user.createdAt ? `${dayjs(user.createdAt.toDate()).format('D MMM YYYY')}, ` : ''}
          {user.orderCount ?? 0} sipariş
          {(user.noShowCount ?? 0) > 0 ? <Text style={styles.noShow}>, {user.noShowCount} gelmedi</Text> : null}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => Linking.openURL(`tel:${user.phone}`)}
          hitSlop={4}
          style={({ pressed }) => [styles.action, styles.call, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${user.name} ara`}
        >
          <Phone size={16} color={colors.ink} />
          <Text style={styles.actionText}>Ara</Text>
        </Pressable>
        <Pressable
          onPress={toggleStatus}
          hitSlop={4}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={suspended ? `${user.name} aktifleştir` : `${user.name} askıya al`}
        >
          <Text style={[styles.actionText, !suspended && styles.danger]}>{suspended ? 'Aktifleştir' : 'Askıya al'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PeopleScreen() {
  const { items: students, loading, error } = useStudents();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<UserStatus>('active');

  const counts = {
    active: students.filter((s) => s.status === 'active').length,
    suspended: students.filter((s) => s.status === 'suspended').length,
  };

  const visible = useMemo(() => {
    const q = searchKey(search);
    const digits = search.replace(/\D/g, '');
    return students
      .filter((s) => s.status === filter)
      .filter((s) => {
        if (!q) return true;
        const phoneDigits = s.phone.replace(/\D/g, '');
        return searchKey(s.name).includes(q) || (digits.length >= 3 && phoneDigits.includes(digits.replace(/^0/, '')));
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [students, search, filter]);

  return (
    <TabScreen title="Kişiler">
      <View style={styles.column}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Ad ya da telefon" style={styles.search} />
        <View style={styles.filters}>
          <Chip label={`Aktif ${counts.active}`} selected={filter === 'active'} onPress={() => setFilter('active')} />
          <Chip label={`Askıda ${counts.suspended}`} selected={filter === 'suspended'} onPress={() => setFilter('suspended')} />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.ink} style={styles.status} />
        ) : error ? (
          <Text style={[text.error, styles.status]}>Kişiler yüklenemedi. İnternet bağlantını kontrol et.</Text>
        ) : visible.length === 0 ? (
          <Text style={[text.small, styles.status]}>
            {search ? 'Aramana uyan kimse yok.' : filter === 'active' ? 'Henüz öğrenci yok.' : 'Askıda kimse yok.'}
          </Text>
        ) : (
          visible.map((u) => <PersonRow key={u.id} user={u} />)
        )}
      </View>
    </TabScreen>
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
  search: {
    marginHorizontal: spacing.gutter,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.gutter,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  status: {
    padding: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  noShow: {
    color: colors.busy,
  },
  actions: {
    gap: spacing.xxs,
    alignItems: 'stretch',
  },
  action: {
    minHeight: 36,
    minWidth: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: rounded.button,
  },
  call: {
    borderWidth: 1,
    borderColor: colors.ink,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  actionText: {
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.small,
    color: colors.ink,
  },
  danger: {
    color: colors.alert,
  },
});
