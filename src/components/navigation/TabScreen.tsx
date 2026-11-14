import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

interface TabScreenProps {
  title: string;
  children: React.ReactNode;
  /** Üstünde başlık çubuğu olan yığın ekranında üst güvenli alan tekrar eklenmez */
  inStack?: boolean;
}

/** Sekme ekranlarının üst başlığı (display l) + kaydırılan içerik. */
export function TabScreen({ title, children, inStack = false }: TabScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={inStack ? ['left', 'right', 'bottom'] : ['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={text.displayL} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
});
