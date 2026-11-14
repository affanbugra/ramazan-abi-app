import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Button, Chip, TextField, Toast } from '@/components/ui';
import {
  createInvite,
  inviteShareMessage,
  inviteTab,
  revokeInvite,
  useInvites,
  type InviteTab,
} from '@/features/invites/api';
import type { InviteDoc, WithId } from '@/types/models';
import { formatCountdown, formatDateTime, isValidName, normalizeName } from '@/utils/format';
import { useNow } from '@/utils/useNow';
import { colors, layout, rounded, spacing, typography } from '@/theme/tokens';
import { text } from '@/theme/text';

const TABS: { key: InviteTab; label: string }[] = [
  { key: 'active', label: 'Aktif' },
  { key: 'used', label: 'Kullanılmış' },
  { key: 'expired', label: 'Süresi dolmuş' },
  { key: 'revoked', label: 'İptal edilmiş' },
];

function inviteDetail(invite: InviteDoc, tab: InviteTab, now: number): string {
  switch (tab) {
    case 'active':
      return `Kalan ${formatCountdown(invite.expiresAt.toMillis() - now)}`;
    case 'used':
      return invite.usedAt
        ? `${invite.usedByName ?? 'Bir öğrenci'} kullandı, ${formatDateTime(invite.usedAt)}`
        : `${invite.usedByName ?? 'Bir öğrenci'} kullandı`;
    case 'expired':
      return `Süresi doldu, ${formatDateTime(invite.expiresAt)}`;
    case 'revoked':
      return invite.revokedAt ? `İptal edildi, ${formatDateTime(invite.revokedAt)}` : 'İptal edildi';
  }
}

export default function InvitesScreen() {
  const { invites, loading, error } = useInvites();
  const now = useNow(1000);
  const [tab, setTab] = useState<InviteTab>('active');

  const [label, setLabel] = useState('');
  const [labelError, setLabelError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ code: string; expiresAt: number; label: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<InviteTab, WithId<InviteDoc>[]> = { active: [], used: [], expired: [], revoked: [] };
    for (const invite of invites) groups[inviteTab(invite, now)].push(invite);
    return groups;
  }, [invites, now]);

  const handleCreate = async () => {
    if (creating) return;
    const clean = normalizeName(label);
    if (!isValidName(clean)) {
      setLabelError('Kime verdiğini yaz, ör. "Ahmet, oda 214".');
      return;
    }
    setLabelError(null);
    setCreating(true);
    const result = await createInvite(clean);
    setCreating(false);
    if (result.ok) {
      setCreated({ code: result.code, expiresAt: result.expiresAt, label: clean });
      setLabel('');
    } else if (result.error.field === 'label') {
      setLabelError(result.error.message);
    } else {
      setToast(result.error.message);
    }
  };

  const handleCopy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setToast('Kod kopyalandı');
  };

  const handleShare = (code: string) => {
    Share.share({ message: inviteShareMessage(code) }).catch(() => undefined);
  };

  const confirmRevoke = (code: string) =>
    Alert.alert('Kod iptal edilsin mi?', `${code} artık kayıt için kullanılamaz.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: () => revokeInvite(code).catch(() => setToast('Kod iptal edilemedi. Tekrar dene.')),
      },
    ]);

  const createdRemaining = created ? created.expiresAt - now : 0;
  const list = grouped[tab];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[text.displayL, styles.title]} accessibilityRole="header">
          Davet kodları
        </Text>

        {created ? (
          <View style={styles.createdCard}>
            <Text style={text.small}>{created.label} için</Text>
            <Text style={styles.bigCode} selectable accessibilityLabel={`Kod ${created.code.split('').join(' ')}`}>
              {created.code}
            </Text>
            <Text style={[text.small, createdRemaining <= 0 && styles.expiredText]}>
              {createdRemaining > 0 ? `1 saat geçerli, ${formatCountdown(createdRemaining)}` : 'Süresi doldu'}
            </Text>
            <View style={styles.createdActions}>
              <Button
                title="Kopyala"
                variant="secondary"
                onPress={() => handleCopy(created.code)}
                style={styles.flex}
              />
              <Button title="Paylaş" onPress={() => handleShare(created.code)} style={styles.flex} />
            </View>
            <Button title="Yeni kod oluştur" variant="text" onPress={() => setCreated(null)} />
          </View>
        ) : (
          <View style={styles.createForm}>
            <TextField
              label="Kime veriyorsun?"
              value={label}
              onChangeText={(v) => {
                setLabel(v);
                if (labelError) setLabelError(null);
              }}
              error={labelError}
              placeholder="Ör. Ahmet, oda 214"
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <Button title="Kod oluştur" loading={creating} onPress={handleCreate} />
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((t) => (
            <Chip
              key={t.key}
              label={grouped[t.key].length > 0 ? `${t.label} ${grouped[t.key].length}` : t.label}
              selected={tab === t.key}
              onPress={() => setTab(t.key)}
            />
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.ink} style={styles.status} />
        ) : error ? (
          <Text style={[text.error, styles.status]}>Kodlar yüklenemedi. İnternet bağlantını kontrol et.</Text>
        ) : list.length === 0 ? (
          <Text style={[text.small, styles.status]}>Bu listede kod yok.</Text>
        ) : (
          list.map((invite, index) => (
            <View key={invite.id} style={[styles.row, index > 0 && styles.rowDivider]}>
              <View style={styles.flex}>
                <Text style={styles.rowCode}>{invite.code}</Text>
                <Text style={text.body}>{invite.label}</Text>
                <Text style={text.small}>{inviteDetail(invite, tab, now)}</Text>
              </View>
              {tab === 'active' ? (
                <Button title="İptal et" variant="text" destructive onPress={() => confirmRevoke(invite.code)} />
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <Toast message={toast ?? ''} visible={toast !== null} onDismiss={() => setToast(null)} hapticType="none" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  content: {
    paddingBottom: spacing.xl,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
  },
  title: {
    paddingHorizontal: spacing.gutter,
    marginBottom: spacing.lg,
  },
  flex: {
    flex: 1,
  },
  createForm: {
    paddingHorizontal: spacing.gutter,
  },
  createdCard: {
    marginHorizontal: spacing.gutter,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
  },
  bigCode: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.sizes.xl,
    letterSpacing: typography.display.codeLetterSpacing,
    color: colors.ink,
    marginVertical: spacing.xxs,
  },
  expiredText: {
    color: colors.alert,
  },
  createdActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xxs,
  },
  tabs: {
    gap: spacing.xs,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  status: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  rowCode: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.sizes.m,
    letterSpacing: typography.display.codeLetterSpacing,
    color: colors.ink,
  },
});
