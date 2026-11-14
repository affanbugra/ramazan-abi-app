import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, TextField } from '@/components/ui';
import { PhotoField } from '@/features/admin/PhotoField';
import { useSession } from '@/features/auth/session';
import { signOut } from '@/features/auth/api';
import { deleteMyAccount, updateProfile } from '@/features/profile/api';
import { formatPhone, isValidName, normalizeName, normalizePhone } from '@/utils/format';
import { colors, layout, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

/** Ad, telefon, profil fotoğrafı (kamera/galeri, kare kırpma, 512px JPEG). */
export function ProfileEditScreen() {
  const session = useSession((s) => s.session);
  const profile = session.status === 'signedIn' ? session.profile : null;
  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile ? formatPhone(profile.phone) : '');
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  if (!profile) return null;
  const shownPhoto = localPhoto ?? (removed ? null : profile.photoURL);

  const save = async () => {
    if (saving) return;
    const cleanName = normalizeName(name);
    const cleanPhone = normalizePhone(phone);
    const found: typeof errors = {};
    if (!isValidName(cleanName)) found.name = 'Adını ve soyadını yaz (2-40 karakter).';
    if (!cleanPhone) found.phone = 'Cep telefonu numaranı 0532 123 45 67 gibi yaz.';
    if (Object.keys(found).length > 0 || !cleanPhone) {
      setErrors(found);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await updateProfile(profile.id, {
        name: cleanName,
        phone: cleanPhone,
        localPhoto,
        removePhoto: removed && !localPhoto,
        oldPhotoURL: profile.photoURL,
      });
      router.back();
    } catch (err) {
      console.warn('Profil kaydedilemedi', err);
      setErrors({ form: 'Kaydedilemedi. İnternet bağlantını kontrol edip tekrar dene.' });
      setSaving(false);
    }
  };

  // Hesap silme bilerek burada, sayfanın en altında (Çıkış yap'ın yanında yanlışlıkla basılıyordu)
  const confirmDelete = () =>
    Alert.alert('Hesabını silmek istiyor musun?', 'Profilin ve fotoğrafın silinir, bir daha bu hesapla giremezsin.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Devam',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Emin misin?', 'Bu işlem geri alınamaz.', [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Hesabımı sil',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteMyAccount();
                  await signOut().catch(() => undefined);
                } catch {
                  Alert.alert('Hesap silinemedi', 'İnternet bağlantını kontrol edip tekrar dene.');
                }
              },
            },
          ]),
      },
    ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[text.displayL, styles.title]} accessibilityRole="header">
            Profili düzenle
          </Text>
          <PhotoField
            label="Profil fotoğrafı"
            uri={shownPhoto}
            squareCrop
            fit="cover"
            onPicked={(uri) => {
              setLocalPhoto(uri);
              setRemoved(false);
            }}
            onRemove={() => {
              setLocalPhoto(null);
              setRemoved(true);
            }}
          />
          <TextField label="Ad soyad" value={name} onChangeText={setName} error={errors.name} maxLength={40} autoCapitalize="words" />
          <TextField
            label="Telefon"
            value={phone}
            onChangeText={setPhone}
            error={errors.phone}
            keyboardType="phone-pad"
            placeholder="0532 123 45 67"
          />
          {errors.form ? <Text style={text.error}>{errors.form}</Text> : null}
          <Button title="Kaydet" loading={saving} onPress={save} style={styles.save} />
          {profile.role === 'student' ? (
            <Text style={styles.delete} onPress={confirmDelete} accessibilityRole="button" suppressHighlighting={false}>
              Hesabımı sil
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
  },
  title: {
    marginBottom: spacing.lg,
  },
  save: {
    marginTop: spacing.md,
  },
  delete: {
    ...text.small,
    color: colors.muted,
    textDecorationLine: 'underline',
    alignSelf: 'center',
    marginTop: spacing.xxl * 2,
    padding: spacing.sm,
  },
});
