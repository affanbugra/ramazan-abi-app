import React from 'react';
import { Tabs } from 'expo-router';
import { DotsThreeOutline, ForkKnife, Package, Receipt, Users } from 'phosphor-react-native';
import { tabIcon, tabScreenOptions } from '@/components/navigation/tabs';

export default function AdminTabsLayout() {
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="orders" options={{ title: 'Siparişler', tabBarIcon: tabIcon(Receipt) }} />
      <Tabs.Screen name="menu" options={{ title: 'Menü', tabBarIcon: tabIcon(ForkKnife) }} />
      <Tabs.Screen name="stock" options={{ title: 'Stok', tabBarIcon: tabIcon(Package) }} />
      <Tabs.Screen name="people" options={{ title: 'Kişiler', tabBarIcon: tabIcon(Users) }} />
      <Tabs.Screen name="more" options={{ title: 'Daha fazla', tabBarIcon: tabIcon(DotsThreeOutline) }} />
    </Tabs>
  );
}
