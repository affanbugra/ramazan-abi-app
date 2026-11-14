import React from 'react';
import { Tabs } from 'expo-router';
import { ForkKnife, Receipt, User } from 'phosphor-react-native';
import { tabIcon, tabScreenOptions } from '@/components/navigation/tabs';
import { useSession } from '@/features/auth/session';
import { isOpenOrder, useMyOrders } from '@/features/orders/api';
import { colors, rounded } from '@/theme/tokens';

export default function StudentTabsLayout() {
  const session = useSession((s) => s.session);
  const uid = session.status === 'signedIn' ? session.profile.id : null;
  const { items: orders } = useMyOrders(uid);
  const hasOpen = orders.some(isOpenOrder);

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="menu" options={{ title: 'Menü', tabBarIcon: tabIcon(ForkKnife) }} />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Siparişlerim',
          tabBarIcon: tabIcon(Receipt),
          // Açık sipariş varken küçük tea nokta (DESIGN.md → Layout)
          tabBarBadge: hasOpen ? '' : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.tea, minWidth: 10, height: 10, borderRadius: rounded.pill, top: 4 },
          tabBarAccessibilityLabel: hasOpen ? 'Siparişlerim, açık siparişin var' : 'Siparişlerim',
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon(User) }} />
    </Tabs>
  );
}
