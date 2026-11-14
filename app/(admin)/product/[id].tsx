import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CaretDown, CaretUp, Trash } from 'phosphor-react-native';
import { AvailabilityToggle, Button, Chip, TextField } from '@/components/ui';
import { PhotoField } from '@/features/admin/PhotoField';
import { deleteProduct, newProductId, saveProduct, useCategories, useProducts } from '@/features/menu/api';
import { deleteImageByUrl, resizeImage, uploadImage } from '@/lib/images';
import type { Variant } from '@/types/models';
import { isValidName, normalizeName } from '@/utils/format';
import { colors, layout, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

interface VariantDraft {
  id: string;
  name: string;
  price: string;
  available: boolean;
}

type Errors = Partial<Record<'name' | 'category' | 'prep' | 'form', string>> & { variants?: Record<string, string> };

const SINGLE_VARIANT_NAME = 'Standart';
const MAX_PRICE = 10000;

function newVariantId(): string {
  return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const onlyDigits = (value: string) => value.replace(/\D/g, '');

export default function ProductEditScreen() {
  const params = useLocalSearchParams<{ id: string; categoryId?: string }>();
  const isNew = params.id === 'new';
  const { items: categories } = useCategories();
  const { items: products, loading } = useProducts();
  const existing = isNew ? null : (products.find((p) => p.id === params.id) ?? null);

  // Yeni ürünün id'si baştan alınır; fotoğraf yolu bu id'yi kullanır
  const productId = useMemo(() => (isNew ? newProductId() : params.id), [isNew, params.id]);

  const [initialized, setInitialized] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId ?? null);
  const [prep, setPrep] = useState('');
  const [available, setAvailable] = useState(true);
  const [variants, setVariants] = useState<VariantDraft[]>([{ id: 'standart', name: SINGLE_VARIANT_NAME, price: '', available: true }]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  // Form canlı veriyle bir kez doldurulur; sonraki değişiklikler yazılanı ezmesin
  useEffect(() => {
    if (initialized) return;
    if (isNew) {
      if (!categoryId && categories[0]) setCategoryId(categories[0].id);
      if (categories.length > 0) setInitialized(true);
      return;
    }
    if (!existing) return;
    setName(existing.name);
    setCategoryId(existing.categoryId);
    setPrep(existing.typicalPrepMin ? String(existing.typicalPrepMin) : '');
    setAvailable(existing.available);
    setVariants(existing.variants.map((v) => ({ id: v.id, name: v.name, price: String(v.price), available: v.available })));
    setImageUrl(existing.imageUrl);
    setInitialized(true);
  }, [initialized, isNew, existing, categories, categoryId]);

  const multi = variants.length > 1;

  const updateVariant = (id: string, patch: Partial<VariantDraft>) =>
    setVariants((list) => list.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const addVariant = () =>
    setVariants((list) => {
      // Tek çeşitliden çok çeşitliye geçerken ilk çeşidin adı kantinciye bırakılır
      const base = list.length === 1 && list[0].name === SINGLE_VARIANT_NAME ? [{ ...list[0], name: '' }] : list;
      return [...base, { id: newVariantId(), name: '', price: '', available: true }];
    });

  const removeVariant = (id: string) => setVariants((list) => (list.length > 1 ? list.filter((v) => v.id !== id) : list));

  const moveVariant = (index: number, delta: -1 | 1) =>
    setVariants((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  const validate = (): { ok: true; variants: Variant[]; prepMin: number | null } | { ok: false; errors: Errors } => {
    const found: Errors = {};
    if (!isValidName(normalizeName(name))) found.name = 'Ürün adını yaz (2-40 karakter).';
    if (!categoryId || !categories.some((c) => c.id === categoryId)) found.category = 'Bir kategori seç.';
    let prepMin: number | null = null;
    if (prep.trim()) {
      prepMin = Number(prep);
      if (!Number.isInteger(prepMin) || prepMin < 1 || prepMin > 120) found.prep = '1 ile 120 dakika arasında olmalı.';
    }
    const variantErrors: Record<string, string> = {};
    const seen = new Set<string>();
    const cleanVariants: Variant[] = variants.map((v) => {
      const price = Number(v.price);
      const vName = multi ? normalizeName(v.name) : SINGLE_VARIANT_NAME;
      if (!v.price || !Number.isInteger(price) || price < 1 || price > MAX_PRICE) {
        variantErrors[v.id] = 'Fiyatı tam sayı olarak yaz, ör. 95.';
      } else if (multi && vName.length < 1) {
        variantErrors[v.id] = 'Çeşidin adını yaz.';
      } else if (multi && seen.has(vName.toLowerCase())) {
        variantErrors[v.id] = 'Bu adla başka bir çeşit var.';
      }
      seen.add(vName.toLowerCase());
      return { id: v.id, name: vName, price, available: v.available };
    });
    if (Object.keys(variantErrors).length > 0) found.variants = variantErrors;
    if (Object.keys(found).length > 0) return { ok: false, errors: found };
    return { ok: true, variants: cleanVariants, prepMin };
  };

  const handleSave = async () => {
    if (saving) return;
    const result = validate();
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      let finalUrl = imageUrl;
      if (localImage) {
        const resized = await resizeImage(localImage, 1080, 'jpeg');
        finalUrl = await uploadImage(resized, `menu/products/${productId}_${Date.now()}.jpg`);
      }
      const order = existing?.order ?? Math.max(0, ...products.filter((p) => p.categoryId === categoryId).map((p) => p.order)) + 1;
      await saveProduct(productId, {
        name: normalizeName(name),
        categoryId: categoryId ?? '',
        order,
        imageUrl: finalUrl,
        typicalPrepMin: result.prepMin,
        available,
        variants: result.variants,
      });
      // Eski fotoğraf değiştiyse ya da kaldırıldıysa Storage'dan silinir
      if (existing?.imageUrl && existing.imageUrl !== finalUrl) await deleteImageByUrl(existing.imageUrl);
      router.back();
    } catch (err) {
      console.warn('Ürün kaydedilemedi', err);
      setErrors({ form: 'Kaydedilemedi. İnternet bağlantını kontrol edip tekrar dene.' });
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert('Ürün silinsin mi?', `${existing.name} menüden tamamen kalkacak.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct(existing);
            router.back();
          } catch {
            Alert.alert('Silinemedi', 'İnternet bağlantını kontrol edip tekrar dene.');
          }
        },
      },
    ]);
  };

  if (!isNew && loading) {
    return <ActivityIndicator color={colors.ink} style={styles.loading} />;
  }
  if (!isNew && !existing && !loading) {
    return (
      <View style={styles.missing}>
        <Text style={text.body}>Bu ürün artık yok.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[text.displayL, styles.title]} accessibilityRole="header">
            {isNew ? 'Yeni ürün' : 'Ürünü düzenle'}
          </Text>

          <PhotoField
            label="Fotoğraf"
            uri={localImage ?? imageUrl}
            squareCrop
            fit="cover"
            onPicked={setLocalImage}
            onRemove={() => {
              setLocalImage(null);
              setImageUrl(null);
            }}
          />

          <TextField label="Ürün adı" value={name} onChangeText={setName} error={errors.name} placeholder="Kaşarlı tost" maxLength={40} />

          <Text style={styles.fieldLabel}>Kategori</Text>
          <View style={styles.chips}>
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} selected={c.id === categoryId} onPress={() => setCategoryId(c.id)} />
            ))}
          </View>
          {errors.category ? <Text style={[text.error, styles.inlineError]}>{errors.category}</Text> : null}

          <TextField
            label="Genelde kaç dakikada hazır?"
            value={prep}
            onChangeText={(v) => setPrep(onlyDigits(v))}
            error={errors.prep}
            hint="Boş bırakabilirsin. Öğrenci ürün detayında görür."
            keyboardType="number-pad"
            placeholder="15"
            maxLength={3}
            containerStyle={styles.prep}
          />

          <View style={styles.availableRow}>
            <View style={styles.flex}>
              <Text style={text.bodyMedium}>Satışta</Text>
              <Text style={text.small}>Tükendi yaparsan öğrenci sepete ekleyemez.</Text>
            </View>
            <AvailabilityToggle available={available} onChange={setAvailable} label="Ürün" />
          </View>

          <Text style={[text.displayM, styles.sectionTitle]}>{multi ? 'Çeşitler' : 'Fiyat'}</Text>
          {!multi ? (
            <TextField
              label="Fiyat (₺)"
              value={variants[0].price}
              onChangeText={(v) => updateVariant(variants[0].id, { price: onlyDigits(v) })}
              error={errors.variants?.[variants[0].id]}
              keyboardType="number-pad"
              placeholder="75"
              maxLength={5}
            />
          ) : (
            variants.map((v, index) => (
              <View key={v.id} style={styles.variantCard}>
                <View style={styles.variantFields}>
                  <TextField
                    label="Çeşit adı"
                    value={v.name}
                    onChangeText={(value) => updateVariant(v.id, { name: value })}
                    placeholder="Kaşarlı"
                    maxLength={30}
                    containerStyle={styles.variantName}
                  />
                  <TextField
                    label="Fiyat (₺)"
                    value={v.price}
                    onChangeText={(value) => updateVariant(v.id, { price: onlyDigits(value) })}
                    keyboardType="number-pad"
                    placeholder="95"
                    maxLength={5}
                    containerStyle={styles.variantPrice}
                  />
                </View>
                {errors.variants?.[v.id] ? <Text style={[text.error, styles.inlineError]}>{errors.variants[v.id]}</Text> : null}
                <View style={styles.variantActions}>
                  <AvailabilityToggle
                    compact
                    available={v.available}
                    onChange={(value) => updateVariant(v.id, { available: value })}
                    label={v.name || 'Çeşit'}
                  />
                  <View style={styles.flex} />
                  <IconButton label="Yukarı taşı" disabled={index === 0} onPress={() => moveVariant(index, -1)}>
                    <CaretUp size={20} color={index === 0 ? colors.hairline : colors.ink} />
                  </IconButton>
                  <IconButton label="Aşağı taşı" disabled={index === variants.length - 1} onPress={() => moveVariant(index, 1)}>
                    <CaretDown size={20} color={index === variants.length - 1 ? colors.hairline : colors.ink} />
                  </IconButton>
                  <IconButton label="Çeşidi sil" onPress={() => removeVariant(v.id)}>
                    <Trash size={20} color={colors.alert} />
                  </IconButton>
                </View>
              </View>
            ))
          )}
          <Button title="Çeşit ekle" variant="secondary" onPress={addVariant} style={styles.addVariant} />

          {errors.form ? <Text style={[text.error, styles.inlineError]}>{errors.form}</Text> : null}
          <Button title="Kaydet" loading={saving} onPress={handleSave} style={styles.save} />
          {existing ? <Button title="Ürünü sil" variant="text" destructive onPress={handleDelete} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function IconButton({
  label,
  disabled = false,
  onPress,
  children,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [styles.iconButton, pressed && !disabled && styles.iconPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      {children}
    </Pressable>
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
  loading: {
    marginTop: spacing.xxl,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  fieldLabel: {
    ...text.bodyMedium,
    fontSize: text.small.fontSize,
    marginBottom: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  inlineError: {
    marginTop: spacing.xxs,
    marginBottom: spacing.xs,
  },
  prep: {
    marginTop: spacing.lg,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  variantCard: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  variantFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  variantName: {
    flex: 2,
    marginBottom: 0,
  },
  variantPrice: {
    flex: 1,
    marginBottom: 0,
  },
  variantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: rounded.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPressed: {
    backgroundColor: colors.hairline,
  },
  addVariant: {
    marginTop: spacing.xs,
  },
  save: {
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
});
