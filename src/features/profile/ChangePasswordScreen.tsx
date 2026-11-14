import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, TextField } from '@/components/ui';
import { AuthFormLayout } from '@/features/auth/AuthFormLayout';
import { changePassword } from '@/features/profile/api';
import { spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

type Field = 'current' | 'next' | 'repeat' | 'form';

export function ChangePasswordScreen() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (saving) return;
    const found: Partial<Record<Field, string>> = {};
    if (!current) found.current = 'Mevcut şifreni yaz.';
    if (next.length < 6) found.next = 'Yeni şifre en az 6 karakter olmalı.';
    else if (next !== repeat) found.repeat = 'İki şifre aynı değil.';
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setErrors({});
    setSaving(true);
    const result = await changePassword(current, next);
    setSaving(false);
    if (result) {
      setErrors({ [result.field]: result.message });
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <AuthFormLayout title="Şifren değişti">
        <Text style={[text.body, styles.paragraph]}>Bir dahaki girişte yeni şifreni kullan.</Text>
        <Button title="Profile dön" variant="secondary" onPress={() => router.back()} />
      </AuthFormLayout>
    );
  }

  return (
    <AuthFormLayout title="Şifre değiştir">
      <TextField
        label="Mevcut şifre"
        value={current}
        onChangeText={setCurrent}
        error={errors.current}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      <TextField
        label="Yeni şifre"
        value={next}
        onChangeText={setNext}
        error={errors.next}
        hint="En az 6 karakter"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Yeni şifre (tekrar)"
        value={repeat}
        onChangeText={setRepeat}
        error={errors.repeat}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={save}
      />
      {errors.form ? <Text style={[text.error, styles.formError]}>{errors.form}</Text> : null}
      <Button title="Şifreyi değiştir" loading={saving} onPress={save} />
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    marginBottom: spacing.lg,
  },
  formError: {
    marginBottom: spacing.md,
  },
});
