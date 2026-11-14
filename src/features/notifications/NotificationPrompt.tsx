import React, { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellRinging } from 'phosphor-react-native';
import { Button } from '@/components/ui';
import { dismissPrompt, requestPermissionAndRegister } from '@/lib/notifications';
import { colors, layout, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

interface NotificationPromptProps {
  visible: boolean;
  uid: string;
  role: 'student' | 'admin';
  onClose: () => void;
}

/** Sistem izin penceresinden önce kendi ön-ekranımız (PROJE.md 9). */
export function NotificationPrompt({ visible, uid, role, onClose }: NotificationPromptProps) {
  const [busy, setBusy] = useState(false);

  const allow = async () => {
    setBusy(true);
    await requestPermissionAndRegister(uid).catch(() => undefined);
    setBusy(false);
    onClose();
  };

  const later = async () => {
    await dismissPrompt();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={later}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <BellRinging size={40} color={colors.tea} />
          <Text style={[text.displayL, styles.title]}>
            {role === 'student' ? 'Siparişin hazır olunca haber verelim' : 'Yeni sipariş gelince haber verelim'}
          </Text>
          <Text style={[text.body, styles.body]}>
            {role === 'student'
              ? 'Hazırlanmaya başlayınca, süre uzayınca ve hazır olunca bildirim gelir. Kantinde boş yere beklemezsin.'
              : 'Uygulama kapalıyken de yeni siparişler ve öğrenci mesajları sesli bildirimle gelir.'}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button title="Bildirimleri aç" loading={busy} onPress={allow} />
          <Button title="Şimdi değil" variant="text" onPress={later} />
        </View>
      </SafeAreaView>
    </Modal>
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
    justifyContent: 'center',
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
  },
  title: {
    marginTop: spacing.lg,
  },
  body: {
    marginTop: spacing.sm,
    color: colors.muted,
  },
  actions: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
  },
});
