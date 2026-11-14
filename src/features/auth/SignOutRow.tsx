import React from 'react';
import { Alert } from 'react-native';
import { SignOut } from 'phosphor-react-native';
import { ListRow } from '@/components/ui';
import { signOut } from '@/features/auth/api';
import { colors } from '@/theme/tokens';

export function SignOutRow() {
  const confirm = () =>
    Alert.alert('Çıkış yapılsın mı?', undefined, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış yap', style: 'destructive', onPress: () => signOut().catch(() => undefined) },
    ]);

  return (
    <ListRow
      title="Çıkış yap"
      icon={<SignOut size={20} color={colors.ink} />}
      showChevron={false}
      hasBottomDivider={false}
      onPress={confirm}
    />
  );
}
