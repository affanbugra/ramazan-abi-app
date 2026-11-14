import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { categoryIcon } from '@/features/menu/icons';
import type { CategoryDoc, WithId } from '@/types/models';
import { colors, spacing, typography } from '@/theme/tokens';

export interface CategoryStripProps {
  categories: WithId<CategoryDoc>[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const PHOTO = 64;

/** Yatay kategori şeridi: arka plansız yemek fotoğrafı + altında ad; seçili olanın altında tea çizgi. */
export const CategoryStrip: React.FC<CategoryStripProps> = ({ categories, selectedId, onSelect }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {categories.map((category) => {
        const selected = category.id === selectedId;
        const Icon = categoryIcon(category.placeholderIcon);
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={category.name}
            style={styles.item}
          >
            <View style={styles.photo}>
              {category.imageUrl ? (
                <Image source={{ uri: category.imageUrl }} style={styles.image} contentFit="contain" transition={150} />
              ) : (
                <Icon size={32} color={colors.teaDeep} weight="regular" />
              )}
            </View>
            <Text style={[styles.label, selected ? styles.labelSelected : styles.labelIdle]} numberOfLines={2}>
              {category.name}
            </Text>
            <View style={[styles.underline, selected && styles.underlineSelected]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.gutter,
    gap: spacing.lg,
  },
  item: {
    width: PHOTO + spacing.md,
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  photo: {
    width: PHOTO,
    height: PHOTO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: PHOTO,
    height: PHOTO,
  },
  label: {
    marginTop: spacing.xs,
    fontFamily: typography.body.fontFamily.medium,
    fontSize: typography.body.sizes.small,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.ink,
  },
  labelIdle: {
    color: colors.muted,
  },
  underline: {
    marginTop: spacing.xs,
    height: 2,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  underlineSelected: {
    backgroundColor: colors.tea,
  },
});
