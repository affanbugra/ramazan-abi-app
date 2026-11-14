import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui';
import { TabScreen } from '@/components/navigation/TabScreen';
import { AdminProductRow } from '@/features/admin/AdminProductRow';
import { useCategories, useProducts } from '@/features/menu/api';
import { colors, layout, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

export default function AdminMenuScreen() {
  const { items: categories, loading: categoriesLoading, error } = useCategories();
  const { items: products, loading: productsLoading } = useProducts();
  const loading = categoriesLoading || productsLoading;

  return (
    <TabScreen title="Menü">
      <View style={styles.column}>
        <View style={styles.actions}>
          <Button
            title="Yeni ürün"
            onPress={() => router.push({ pathname: '/(admin)/product/[id]', params: { id: 'new' } })}
            style={styles.flex}
          />
          <Button
            title="Yeni kategori"
            variant="secondary"
            onPress={() => router.push({ pathname: '/(admin)/category/[id]', params: { id: 'new' } })}
            style={styles.flex}
          />
        </View>
        <Button
          title="Kategorileri sırala"
          variant="text"
          onPress={() => router.push({ pathname: '/(admin)/reorder', params: { type: 'categories' } })}
          style={styles.sortButton}
        />

        {loading ? (
          <ActivityIndicator color={colors.ink} style={styles.status} />
        ) : error ? (
          <Text style={[text.error, styles.status]}>Menü yüklenemedi. İnternet bağlantını kontrol et.</Text>
        ) : (
          categories.map((category) => {
            const items = products.filter((p) => p.categoryId === category.id);
            return (
              <View key={category.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[text.displayM, styles.flex]} accessibilityRole="header">
                    {category.name}
                  </Text>
                  <Button
                    title="Düzenle"
                    variant="text"
                    onPress={() => router.push({ pathname: '/(admin)/category/[id]', params: { id: category.id } })}
                  />
                </View>
                {items.length === 0 ? (
                  <Text style={[text.small, styles.empty]}>Bu kategoride ürün yok.</Text>
                ) : (
                  items.map((product) => (
                    <AdminProductRow
                      key={product.id}
                      product={product}
                      placeholderIcon={category.placeholderIcon}
                      placeholderImage={category.imageUrl}
                      onPress={() => router.push({ pathname: '/(admin)/product/[id]', params: { id: product.id } })}
                    />
                  ))
                )}
              </View>
            );
          })
        )}
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
  },
  sortButton: {
    alignSelf: 'flex-start',
    marginLeft: spacing.xs,
  },
  status: {
    padding: spacing.xl,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.gutter,
    paddingRight: spacing.xs,
  },
  empty: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.sm,
  },
});
