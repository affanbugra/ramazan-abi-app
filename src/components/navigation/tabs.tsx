import React from 'react';
import type { ColorValue } from 'react-native';
import type { Icon } from 'phosphor-react-native';
import { colors, typography } from '@/theme/tokens';

/** Öğrenci ve kantinci sekme çubuklarının ortak görünümü (DESIGN.md → Layout). */
export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.tea,
  tabBarInactiveTintColor: colors.muted,
  tabBarStyle: { backgroundColor: colors.ground, borderTopColor: colors.hairline },
  tabBarLabelStyle: { fontFamily: typography.body.fontFamily.medium, fontSize: typography.body.sizes.caption },
  sceneStyle: { backgroundColor: colors.ground },
} as const;

export function tabIcon(IconComponent: Icon) {
  return function TabBarIcon({ color }: { color: ColorValue }) {
    return <IconComponent size={24} color={typeof color === 'string' ? color : colors.muted} weight="regular" />;
  };
}
