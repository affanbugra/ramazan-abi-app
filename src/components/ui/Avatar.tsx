import React from 'react';
import { StyleSheet, Text, View, ViewStyle, ImageStyle, StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { User } from 'phosphor-react-native';
import { colors, rounded, typography } from '@/theme/tokens';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  photoURL?: string | null;
  name?: string | null;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 96,
};

function getInitials(name?: string | null): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('tr-TR');
}

export const Avatar: React.FC<AvatarProps> = ({
  photoURL,
  name,
  size = 'md',
  style,
  imageStyle,
}) => {
  const dimension = SIZE_MAP[size];
  const initials = getInitials(name);

  const containerStyle = {
    width: dimension,
    height: dimension,
    borderRadius: rounded.pill,
  };

  if (photoURL) {
    return (
      <View style={[styles.imageWrapper, containerStyle, style]}>
        <Image
          source={{ uri: photoURL }}
          style={[styles.image, imageStyle]}
          contentFit="cover"
          transition={150}
          accessibilityLabel={name ? `${name} profil fotoğrafı` : 'Profil fotoğrafı'}
        />
      </View>
    );
  }

  const iconSize = size === 'lg' ? 44 : size === 'md' ? 24 : 16;
  const textSize = size === 'lg' ? 28 : size === 'md' ? 16 : 12;

  return (
    <View style={[styles.fallbackContainer, containerStyle, style]}>
      {initials ? (
        <Text style={[styles.initials, { fontSize: textSize }]}>{initials}</Text>
      ) : (
        <User size={iconSize} color={colors.teaDeep} weight="regular" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  imageWrapper: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    backgroundColor: colors.teaSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontFamily: typography.body.fontFamily.semiBold,
    color: colors.teaDeep,
  },
});
