import React from 'react';
import { router } from 'expo-router';
import { ChartBar, Storefront, Ticket, User } from 'phosphor-react-native';
import { ListRow } from '@/components/ui';
import { TabScreen } from '@/components/navigation/TabScreen';
import { SignOutRow } from '@/features/auth/SignOutRow';
import { colors } from '@/theme/tokens';

export default function MoreScreen() {
  return (
    <TabScreen title="Daha fazla">
      <ListRow
        title="Raporlar"
        subtitle="Ciro, en çok satanlar, yoğun saatler"
        icon={<ChartBar size={20} color={colors.ink} />}
        onPress={() => router.push('/(admin)/reports')}
      />
      <ListRow
        title="Davet kodları"
        subtitle="Yeni öğrenci için kod oluştur"
        icon={<Ticket size={20} color={colors.ink} />}
        onPress={() => router.push('/(admin)/invites')}
      />
      <ListRow
        title="Kantin ayarları"
        subtitle="Kişi başı açık sipariş sınırı"
        icon={<Storefront size={20} color={colors.ink} />}
        onPress={() => router.push('/(admin)/shop-settings')}
      />
      <ListRow
        title="Profil"
        subtitle="Ad, telefon, şifre, bildirimler"
        icon={<User size={20} color={colors.ink} />}
        onPress={() => router.push('/(admin)/profile')}
      />
      <SignOutRow />
    </TabScreen>
  );
}
