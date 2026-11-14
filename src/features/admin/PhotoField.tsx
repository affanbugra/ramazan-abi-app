import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Camera } from 'phosphor-react-native';
import { Button } from '@/components/ui';
import { askImageSource, pickImage } from '@/lib/images';
import { colors, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

interface PhotoFieldProps {
  label: string;
  /** Gösterilecek görsel: yeni seçilen yerel dosya ya da kayıtlı adres */
  uri: string | null;
  squareCrop: boolean;
  /** Kategori fotoğrafları arka plansız PNG olduğu için kırpılmadan sığdırılır */
  fit: 'cover' | 'contain';
  hint?: string;
  onPicked: (localUri: string) => void;
  onRemove: () => void;
}

const SIZE = 160;

export function PhotoField({ label, uri, squareCrop, fit, hint, onPicked, onRemove }: PhotoFieldProps) {
  const choose = async () => {
    const source = await askImageSource();
    if (!source) return;
    const picked = await pickImage(source, { squareCrop });
    if (picked) onPicked(picked);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={choose}
          style={({ pressed }) => [styles.box, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={uri ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}
        >
          {uri ? (
            <Image source={{ uri }} style={styles.image} contentFit={fit} transition={150} />
          ) : (
            <Camera size={32} color={colors.teaDeep} />
          )}
        </Pressable>
        <View style={styles.side}>
          <Button title={uri ? 'Değiştir' : 'Fotoğraf ekle'} variant="secondary" onPress={choose} />
          {uri ? <Button title="Kaldır" variant="text" destructive onPress={onRemove} /> : null}
        </View>
      </View>
      {hint ? <Text style={[text.caption, styles.hint]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...text.bodyMedium,
    fontSize: text.small.fontSize,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  box: {
    width: SIZE,
    height: SIZE,
    borderRadius: rounded.photo,
    overflow: 'hidden',
    backgroundColor: colors.teaSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  side: {
    flex: 1,
    gap: spacing.xs,
  },
  hint: {
    marginTop: spacing.xs,
  },
});
