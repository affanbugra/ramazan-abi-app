import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Button } from '@/components/ui';
import { colors, layout, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

const PHOTO = require('../../assets/images/welcome/kantin.jpg');
const LOGO = require('../../assets/images/icon.png');
const LOGO_SIZE = 56;

/** Karşılama: üstte kantinde çekilmiş gerçek fotoğraf, altında yuvarlatılmış beyaz alanda marka ve butonlar. */
export default function WelcomeScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      {/* Fotoğraf boş alanı doldurur; ekran boyu ne olursa olsun boşluk kalmaz */}
      <Image source={PHOTO} style={styles.photo} contentFit="cover" contentPosition="center" accessibilityLabel="Kantinden bir menemen tepsisi" />
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet}>
        <View style={styles.inner}>
          <View style={styles.brandRow}>
            <Image source={LOGO} style={styles.logo} contentFit="cover" accessibilityIgnoresInvertColors />
            <Text style={[text.displayXl, styles.title]} accessibilityRole="header">
              Ramazan Abi
            </Text>
          </View>
          <Text style={[text.body, styles.tagline]}>Uygulamadan sipariş ver, hazır olunca bildirim gelsin.</Text>
          <View style={styles.actions}>
            <Button title="Giriş yap" onPress={() => router.push('/(auth)/login')} />
            <Button title="Davet koduyla kayıt ol" variant="secondary" onPress={() => router.push('/(auth)/register')} />
            <Button title="Önce menüye göz at" variant="text" onPress={() => router.push('/(auth)/menu')} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  photo: {
    flex: 1,
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.ground,
    borderTopLeftRadius: rounded.sheet,
    borderTopRightRadius: rounded.sheet,
    marginTop: -rounded.sheet,
  },
  inner: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: rounded.button,
  },
  title: {
    color: colors.tea,
  },
  tagline: {
    marginTop: spacing.sm,
    color: colors.muted,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
});
