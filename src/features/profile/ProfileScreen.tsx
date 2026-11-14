import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, LockKey, PencilSimple } from 'phosphor-react-native';
import { Avatar, ListRow } from '@/components/ui';
import { TabScreen } from '@/components/navigation/TabScreen';
import { useSession } from '@/features/auth/session';
import { SignOutRow } from '@/features/auth/SignOutRow';
import { useMyOrders } from '@/features/orders/api';
import { membershipLabel, topProductName } from '@/features/profile/api';
import { permissionState, requestPermissionAndRegister, type PermissionState } from '@/lib/notifications';
import { formatPhone } from '@/utils/format';
import { colors, layout, rounded, shadows, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

interface ProfileScreenProps {
  variant: 'student' | 'admin';
  /** Kantincide sekme değil yığın ekranı; başlık yine "Profil" */
  inStack?: boolean;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={text.displayM} numberOfLines={1}>
        {value}
      </Text>
      <Text style={text.caption}>{label}</Text>
    </View>
  );
}

/** Profil (PROJE.md 6.5): öğrencide Airbnb profil kartı gibi istatistikli kart; kantincide kartsız. */
export function ProfileScreen({ variant, inStack = false }: ProfileScreenProps) {
  const session = useSession((s) => s.session);
  const profile = session.status === 'signedIn' ? session.profile : null;
  const { items: orders } = useMyOrders(variant === 'student' && profile ? profile.id : null);
  const [permission, setPermission] = useState<PermissionState | null>(null);

  const refreshPermission = useCallback(() => {
    permissionState()
      .then(setPermission)
      .catch(() => setPermission(null));
  }, []);

  // Ayarlardan dönünce izin durumu yenilensin
  useEffect(() => {
    refreshPermission();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refreshPermission());
    return () => sub.remove();
  }, [refreshPermission]);

  if (!profile) return null;
  const base = variant === 'admin' ? '/(admin)' : '/(student)';
  const top = topProductName(orders);
  const since = membershipLabel(profile.createdAt);

  const onNotifications = async () => {
    if (permission === 'undetermined') {
      setPermission(await requestPermissionAndRegister(profile.id));
      return;
    }
    Linking.openSettings().catch(() => undefined);
  };

  const permissionLabel = permission === 'granted' ? 'Açık' : permission === 'denied' ? 'Kapalı' : permission === 'undetermined' ? 'Aç' : '';

  return (
    <TabScreen title="Profil" inStack={inStack}>
      <View style={styles.column}>
        {variant === 'student' ? (
          <View style={styles.card}>
            <View style={styles.identity}>
              <Avatar name={profile.name} photoURL={profile.photoURL} size="lg" />
              <Text style={[text.displayM, styles.name]} numberOfLines={2}>
                {profile.name}
              </Text>
              <Text style={text.small}>{formatPhone(profile.phone)}</Text>
            </View>
            <View style={styles.stats}>
              <Stat value={String(profile.orderCount ?? 0)} label="sipariş" />
              {top ? <Stat value={top} label="en çok" /> : null}
              {since ? <Stat value={since} label="kantinde" /> : null}
            </View>
          </View>
        ) : (
          <View style={styles.simple}>
            <Avatar name={profile.name} photoURL={profile.photoURL} size="md" />
            <View style={styles.flex}>
              <Text style={text.bodyMedium}>{profile.name}</Text>
              <Text style={text.small}>{formatPhone(profile.phone)}</Text>
            </View>
          </View>
        )}

        <ListRow
          title="Profili düzenle"
          icon={<PencilSimple size={20} color={colors.ink} />}
          onPress={() => router.push(`${base}/profile-edit` as never)}
        />
        <ListRow
          title="Bildirimler"
          value={permissionLabel}
          subtitle={permission === 'denied' ? 'Ayarları aç' : undefined}
          icon={<Bell size={20} color={colors.ink} />}
          onPress={onNotifications}
        />
        <ListRow
          title="Şifre değiştir"
          icon={<LockKey size={20} color={colors.ink} />}
          onPress={() => router.push(`${base}/change-password` as never)}
        />
        <SignOutRow />
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
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
  },
  card: {
    marginHorizontal: spacing.gutter,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: rounded.card,
    backgroundColor: colors.ground,
    flexDirection: 'row',
    gap: spacing.md,
    ...shadows.floating,
  },
  identity: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  stats: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stat: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    paddingBottom: spacing.xs,
  },
  simple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.lg,
  },
});
