import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { QuantityStepper } from './QuantityStepper';
import { TextField } from './TextField';
import { VariantRadioRow } from './VariantRadioRow';
import { useCart, MAX_QTY } from '@/features/cart/store';
import { firstAvailableVariant, isSingleVariant, isVariantOrderable } from '@/features/menu/api';
import { categoryIcon } from '@/features/menu/icons';
import type { ProductDoc, WithId } from '@/types/models';
import { formatPrice } from '@/utils/format';
import { colors, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

export interface ProductSheetProps {
  ref: React.Ref<BottomSheetModal>;
  product: WithId<ProductDoc> | null;
  placeholderIcon: string | null;
  placeholderImage?: string | null;
  shopOpen: boolean;
  onAdded: (message: string) => void;
}

const NOTE_MAX = 140;

function Backdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />;
}

/** Ürün detayı: çeşit seçimi, not, adet ve "Sepete ekle" (DESIGN.md → Ürün detay ekranı). */
export const ProductSheet: React.FC<ProductSheetProps> = ({ ref, product, placeholderIcon, placeholderImage, shopOpen, onAdded }) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const add = useCart((s) => s.add);

  const [variantId, setVariantId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);

  // Her yeni ürün açılışında form sıfırlanır
  useEffect(() => {
    if (!product) return;
    setVariantId(firstAvailableVariant(product)?.id ?? product.variants[0]?.id ?? null);
    setNote('');
    setQty(1);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback(() => {
    if (ref && typeof ref === 'object') ref.current?.dismiss();
  }, [ref]);

  const variant = product?.variants.find((v) => v.id === variantId) ?? null;
  const orderable = Boolean(product && variant && isVariantOrderable(product, variant));
  const single = product ? isSingleVariant(product) : true;
  const Icon = categoryIcon(placeholderIcon);

  const handleAdd = () => {
    if (!product || !variant || !orderable) return;
    const cleanNote = note.trim();
    const result = add({
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      singleVariant: single,
      unitPrice: variant.price,
      qty,
      note: cleanNote.length > 0 ? cleanNote : null,
    });
    if (result === 'full') {
      onAdded('Sepete en fazla 15 farklı ürün ekleyebilirsin.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onAdded('Sepete eklendi');
    dismiss();
  };

  return (
    <BottomSheetModal
      ref={ref}
      backdropComponent={Backdrop}
      maxDynamicContentSize={height * 0.9}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      {product ? (
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.photo}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.image} contentFit="cover" transition={150} />
            ) : (
              <View style={styles.placeholder}>
                {placeholderImage ? (
                  <Image source={{ uri: placeholderImage }} style={styles.placeholderImage} contentFit="contain" transition={150} />
                ) : (
                  <Icon size={40} color={colors.teaDeep} weight="regular" />
                )}
              </View>
            )}
          </View>

          <Text style={[text.displayM, styles.title]} accessibilityRole="header">
            {product.name}
          </Text>
          {product.typicalPrepMin ? <Text style={text.small}>Genelde ~{product.typicalPrepMin} dk</Text> : null}
          {!product.available ? <Text style={[text.small, styles.soldOutNote]}>Bu ürün şu an tükendi.</Text> : null}

          {!single ? (
            <View style={styles.variants} accessibilityRole="radiogroup">
              {product.variants.map((v, index) => (
                <VariantRadioRow
                  key={v.id}
                  name={v.name}
                  price={v.price}
                  selected={v.id === variantId}
                  available={product.available && v.available}
                  onPress={() => setVariantId(v.id)}
                  showDivider={index > 0}
                />
              ))}
            </View>
          ) : null}

          {orderable && shopOpen ? (
            <>
              <TextField
                label="Not ekle"
                value={note}
                onChangeText={setNote}
                placeholder="Ör. az acılı olsun"
                maxLength={NOTE_MAX}
                InputComponent={BottomSheetTextInput}
                containerStyle={styles.note}
                returnKeyType="done"
              />
              <View style={styles.footer}>
                <QuantityStepper value={qty} onChange={setQty} min={1} max={MAX_QTY} />
                <Button
                  title={`Sepete ekle  ${formatPrice((variant?.price ?? 0) * qty)}`}
                  onPress={handleAdd}
                  style={styles.addButton}
                />
              </View>
            </>
          ) : (
            <Text style={[text.body, styles.closedNote]}>
              {!shopOpen
                ? 'Kantin şu an kapalı. Açılınca sipariş verebilirsin.'
                : 'Bu ürün şu an tükendi. Başka bir şeye göz at.'}
            </Text>
          )}
        </BottomSheetScrollView>
      ) : null}
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.ground,
    borderTopLeftRadius: rounded.sheet,
    borderTopRightRadius: rounded.sheet,
  },
  handle: {
    backgroundColor: colors.hairline,
  },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xs,
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: rounded.photo,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.teaSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ürünün kendi fotoğrafı sanılmasın: kategori ipucu olarak yarı saydam
  placeholderImage: {
    opacity: 0.5,
    width: '60%',
    height: '80%',
  },
  title: {
    marginTop: spacing.md,
  },
  soldOutNote: {
    color: colors.alert,
  },
  variants: {
    marginTop: spacing.md,
  },
  note: {
    marginTop: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addButton: {
    flex: 1,
  },
  closedNote: {
    marginTop: spacing.lg,
    color: colors.muted,
  },
});
