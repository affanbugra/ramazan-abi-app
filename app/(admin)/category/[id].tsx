import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, TextField } from '@/components/ui';
import { PhotoField } from '@/features/admin/PhotoField';
import { deleteCategory, newCategoryId, saveCategory, useCategories, useProducts } from '@/features/menu/api';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '@/features/menu/icons';
import { deleteImageByUrl, resizeImage, uploadImage } from '@/lib/images';
import { isValidName, normalizeName } from '@/utils/format';
import { colors, layout, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

const ICON_CELL = 52;

export default function CategoryEditScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = params.id === 'new';
  const { items: categories, loading } = useCategories();
  const { items: products } = useProducts();
  const existing = isNew ? null : (categories.find((c) => c.id === params.id) ?? null);
  const categoryId = useMemo(() => (isNew ? newCategoryId() : params.id), [isNew, params.id]);
  const productCount = products.filter((p) => p.categoryId === categoryId).length;

  const [initialized, setInitialized] = useState(isNew);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialized || !existing) return;
    setName(existing.name);
    setIcon(existing.placeholderIcon);
    setImageUrl(existing.imageUrl);
    setInitialized(true);
  }, [initialized, existing]);

  const handleSave = async () => {
    if (saving) return;
    const clean = normalizeName(name);
    if (!isValidName(clean)) {
      setNameError('Kategori adını yaz (2-40 karakter).');
      return;
    }
    setNameError(null);
    setFormError(null);
    setSaving(true);
    try {
      let finalUrl = imageUrl;
      if (localImage) {
        // Arka plansız fotoğrafın saydamlığı korunsun diye PNG
        const resized = await resizeImage(localImage, 512, 'png');
        finalUrl = await uploadImage(resized, `menu/categories/${categoryId}_${Date.now()}.png`);
      }
      await saveCategory(categoryId, {
        name: clean,
        order: existing?.order ?? Math.max(0, ...categories.map((c) => c.order)) + 1,
        imageUrl: finalUrl,
        placeholderIcon: icon,
      });
      if (existing?.imageUrl && existing.imageUrl !== finalUrl) await deleteImageByUrl(existing.imageUrl);
      router.back();
    } catch (err) {
      console.warn('Kategori kaydedilemedi', err);
      setFormError('Kaydedilemedi. İnternet bağlantını kontrol edip tekrar dene.');
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert('Kategori silinsin mi?', `${existing.name} menüden kalkacak.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(existing);
            router.back();
          } catch {
            Alert.alert('Silinemedi', 'İnternet bağlantını kontrol edip tekrar dene.');
          }
        },
      },
    ]);
  };

  if (!isNew && loading) return <ActivityIndicator color={colors.ink} style={styles.loading} />;
  if (!isNew && !existing) {
    return (
      <View style={styles.missing}>
        <Text style={text.body}>Bu kategori artık yok.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[text.displayL, styles.title]} accessibilityRole="header">
          {isNew ? 'Yeni kategori' : 'Kategoriyi düzenle'}
        </Text>

        <TextField label="Kategori adı" value={name} onChangeText={setName} error={nameError} placeholder="Tostlar" maxLength={40} />

        <PhotoField
          label="Fotoğraf"
          uri={localImage ?? imageUrl}
          squareCrop={false}
          fit="contain"
          hint="Arka planı olmayan bir fotoğraf en güzel görünür."
          onPicked={setLocalImage}
          onRemove={() => {
            setLocalImage(null);
            setImageUrl(null);
          }}
        />

        <Text style={styles.fieldLabel}>Fotoğraf yokken görünen ikon</Text>
        <View style={styles.icons} accessibilityRole="radiogroup">
          {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => {
            const selected = key === icon;
            return (
              <Pressable
                key={key}
                onPress={() => setIcon(key)}
                style={[styles.iconCell, selected && styles.iconSelected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={key}
              >
                <Icon size={24} color={selected ? colors.ground : colors.teaDeep} />
              </Pressable>
            );
          })}
        </View>

        {!isNew ? (
          <View style={styles.productsBlock}>
            <Text style={text.bodyMedium}>{productCount} ürün</Text>
            {productCount > 1 ? (
              <Button
                title="Ürünleri sırala"
                variant="secondary"
                onPress={() =>
                  router.push({ pathname: '/(admin)/reorder', params: { type: 'products', categoryId } })
                }
                style={styles.sortButton}
              />
            ) : null}
          </View>
        ) : null}

        {formError ? <Text style={[text.error, styles.formError]}>{formError}</Text> : null}
        <Button title="Kaydet" loading={saving} onPress={handleSave} style={styles.save} />
        {existing ? (
          productCount === 0 ? (
            <Button title="Kategoriyi sil" variant="text" destructive onPress={handleDelete} />
          ) : (
            <Text style={[text.small, styles.deleteNote]}>
              İçinde ürün olan kategori silinemez. Önce ürünleri başka kategoriye taşı ya da sil.
            </Text>
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ground,
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
  icons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  iconCell: {
    width: ICON_CELL,
    height: ICON_CELL,
    borderRadius: rounded.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  productsBlock: {
    marginTop: spacing.xl,
  },
  sortButton: {
    marginTop: spacing.sm,
  },
  formError: {
    marginTop: spacing.md,
  },
  save: {
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  deleteNote: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
