import React, { useRef, useState } from 'react';
import { StyleSheet, Text, type TextInputInstance, View } from 'react-native';
import { router } from 'expo-router';
import { Button, TextField } from '@/components/ui';
import { signIn, type FieldError } from '@/features/auth/api';
import { AuthFormLayout } from '@/features/auth/AuthFormLayout';
import { isValidEmail, normalizeEmail } from '@/utils/format';
import { spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

type Field = 'email' | 'password';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<FieldError<Field> | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  const errorFor = (field: Field | 'form') => (error?.field === field ? error.message : null);

  const handleSubmit = async () => {
    if (loading) return;
    const cleanEmail = normalizeEmail(email);
    if (!isValidEmail(cleanEmail)) {
      setError({ field: 'email', message: 'E-posta adresini kontrol et.' });
      return;
    }
    if (!password) {
      setError({ field: 'password', message: 'Şifreni yaz.' });
      return;
    }
    setError(null);
    setLoading(true);
    const result = await signIn(cleanEmail, password);
    // Başarılıysa oturum değişir ve kök layout yönlendirir; buton yükleniyor halinde kalır
    if (result) {
      setError(result);
      setLoading(false);
    }
  };

  return (
    <AuthFormLayout title="Giriş yap">
      <TextField
        label="E-posta"
        value={email}
        onChangeText={setEmail}
        error={errorFor('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={passwordRef}
        label="Şifre"
        value={password}
        onChangeText={setPassword}
        error={errorFor('password')}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      {errorFor('form') ? <Text style={[text.error, styles.formError]}>{errorFor('form')}</Text> : null}
      <View style={styles.actions}>
        <Button title="Giriş yap" loading={loading} onPress={handleSubmit} />
        <Button
          title="Şifremi unuttum"
          variant="text"
          onPress={() => router.push({ pathname: '/(auth)/forgot-password', params: { email: normalizeEmail(email) } })}
        />
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  formError: {
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
