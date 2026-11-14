import React, { useRef, useState } from 'react';
import { StyleSheet, Text, type TextInputInstance } from 'react-native';
import { Button, TextField } from '@/components/ui';
import { registerWithInvite, type FieldError, type RegisterField } from '@/features/auth/api';
import { AuthFormLayout } from '@/features/auth/AuthFormLayout';
import {
  isValidEmail,
  isValidInviteCode,
  isValidName,
  normalizeEmail,
  normalizeInviteCode,
  normalizeName,
  normalizePhone,
} from '@/utils/format';
import { spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

type Errors = Partial<Record<RegisterField | 'form', string>>;

/** Sunucuya gitmeden yakalanabilen hatalar (sunucu aynılarını yine kontrol eder). */
function validate(values: Record<RegisterField, string>): Errors {
  const errors: Errors = {};
  if (!isValidInviteCode(normalizeInviteCode(values.code))) {
    errors.code = 'Kod 6 karakter olmalı. Ramazan abiden aldığın kodu kontrol et.';
  }
  if (!isValidName(normalizeName(values.name))) errors.name = 'Adını ve soyadını yaz.';
  if (!normalizePhone(values.phone)) errors.phone = 'Cep telefonu numaranı 0532 123 45 67 gibi yaz.';
  if (!isValidEmail(normalizeEmail(values.email))) errors.email = 'E-posta adresini kontrol et.';
  if (values.password.length < 6) errors.password = 'Şifre en az 6 karakter olmalı.';
  return errors;
}

export default function RegisterScreen() {
  const [values, setValues] = useState<Record<RegisterField, string>>({
    code: '',
    name: '',
    phone: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const nameRef = useRef<TextInputInstance>(null);
  const phoneRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const setField = (field: RegisterField) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    // Kullanıcı düzeltmeye başlayınca o alanın hatası kalksın
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  const handleSubmit = async () => {
    if (loading) return;
    const found = validate(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setErrors({});
    setLoading(true);
    const error: FieldError<RegisterField> | null = await registerWithInvite({
      code: normalizeInviteCode(values.code),
      name: normalizeName(values.name),
      phone: values.phone,
      email: normalizeEmail(values.email),
      password: values.password,
    });
    // Başarılıysa giriş yapılmış olur ve kök layout menüye yönlendirir
    if (error) {
      setErrors({ [error.field]: error.message });
      setLoading(false);
    }
  };

  return (
    <AuthFormLayout title="Davet koduyla kayıt ol" subtitle="Kodu Ramazan abiden alabilirsin. 1 saat geçerli.">
      <TextField
        label="Davet kodu"
        value={values.code}
        onChangeText={(v) => setField('code')(v.toUpperCase())}
        error={errors.code}
        placeholder="X7K2PQ"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={9}
        returnKeyType="next"
        onSubmitEditing={() => nameRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={nameRef}
        label="Ad soyad"
        value={values.name}
        onChangeText={setField('name')}
        error={errors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={40}
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={phoneRef}
        label="Telefon"
        value={values.phone}
        onChangeText={setField('phone')}
        error={errors.phone}
        placeholder="0532 123 45 67"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={emailRef}
        label="E-posta"
        value={values.email}
        onChangeText={setField('email')}
        error={errors.email}
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
        value={values.password}
        onChangeText={setField('password')}
        error={errors.password}
        hint="En az 6 karakter"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      {errors.form ? <Text style={[text.error, styles.formError]}>{errors.form}</Text> : null}
      <Button title="Kayıt ol" loading={loading} onPress={handleSubmit} style={styles.submit} />
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  formError: {
    marginBottom: spacing.md,
  },
  submit: {
    marginTop: spacing.xs,
  },
});
