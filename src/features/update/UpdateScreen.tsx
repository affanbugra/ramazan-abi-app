import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowCircleUp } from 'phosphor-react-native';
import { Button } from '@/components/ui';
import { STORE_URL } from '@/lib/appVersion';
import { colors, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

/** Zorunlu güncelleme: sürüm settings/shop.minAppVersion'dan eskiyse uygulamanın yerine bu ekran gelir. */
export function UpdateScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ArrowCircleUp size={40} color={colors.tea} weight="regular" />
        <Text style={[text.displayM, styles.title]} accessibilityRole="header">
          Yeni sürüm hazır
        </Text>
        <Text style={[text.body, styles.body]}>Devam etmek için uygulamayı mağazadan güncelle.</Text>
      </View>
      <Button title="Güncelle" onPress={() => Linking.openURL(STORE_URL).catch(() => undefined)} style={styles.button} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ground,
    paddingHorizontal: spacing.gutter,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  body: {
    marginTop: spacing.xs,
    textAlign: 'center',
    color: colors.muted,
  },
  button: {
    marginBottom: spacing.md,
  },
});
