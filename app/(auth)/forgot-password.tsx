import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, TextField } from '@/components/ui';
import { sendPasswordReset } from '@/features/auth/api';
import { AuthFormLayout } from '@/features/auth/AuthFormLayout';
import { isValidEmail, normalizeEmail } from '@/utils/format';
import { spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (loading) return;
    const cleanEmail = normalizeEmail(email);
    if (!isValidEmail(cleanEmail)) {
      setError('E-posta adresini kontrol et.');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await sendPasswordReset(cleanEmail);
    setLoading(false);
    if (result) {
      setError(result.message);
    } else {
      setSentTo(cleanEmail);
    }
  };

  if (sentTo) {
    return (
      <AuthFormLayout title="E-postana bak">
        <Text style={[text.body, styles.paragraph]}>
          {sentTo} adresine şifre sıfırlama bağlantısı gönderdik. Birkaç dakikada gelmezse gereksiz klasörüne de bak.
        </Text>
        <Button title="Girişe dön" variant="secondary" onPress={() => router.back()} />
      </AuthFormLayout>
    );
  }

  return (
    <AuthFormLayout title="Şifremi unuttum" subtitle="E-postana şifreni yenilemen için bir bağlantı gönderelim.">
      <TextField
        label="E-posta"
        value={email}
        onChangeText={setEmail}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
      />
      <Button title="Bağlantı gönder" loading={loading} onPress={handleSubmit} style={styles.submit} />
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    marginBottom: spacing.lg,
  },
  submit: {
    marginTop: spacing.xs,
  },
});
