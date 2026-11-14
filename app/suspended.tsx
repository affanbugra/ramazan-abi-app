import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Prohibit } from 'phosphor-react-native';
import { Button } from '@/components/ui';
import { signOut } from '@/features/auth/api';
import { colors, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

export default function SuspendedScreen() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = () => {
    setLoading(true);
    signOut().catch(() => setLoading(false));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Prohibit size={40} color={colors.alert} weight="regular" />
        <Text style={[text.displayM, styles.title]} accessibilityRole="header">
          Hesabın askıya alındı.
        </Text>
        <Text style={[text.body, styles.body]}>Ramazan abiyle konuşabilirsin.</Text>
      </View>
      <Button title="Çıkış yap" variant="secondary" loading={loading} onPress={handleSignOut} style={styles.button} />
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
