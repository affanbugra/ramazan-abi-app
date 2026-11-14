// Ekranlarda tekrar eden metin stilleri. Değerler yalnızca tokens.ts'ten gelir.
import { StyleSheet } from 'react-native';
import { colors, typography } from './tokens';

const { display, body } = typography;

export const text = StyleSheet.create({
  displayXl: {
    fontFamily: display.fontFamily,
    fontSize: display.sizes.xl,
    letterSpacing: display.letterSpacing,
    color: colors.ink,
  },
  displayL: {
    fontFamily: display.fontFamily,
    fontSize: display.sizes.l,
    letterSpacing: display.letterSpacing,
    color: colors.ink,
  },
  displayM: {
    fontFamily: display.fontFamily,
    fontSize: display.sizes.m,
    letterSpacing: display.letterSpacing,
    color: colors.ink,
  },
  body: {
    fontFamily: body.fontFamily.regular,
    fontSize: body.sizes.body,
    lineHeight: body.sizes.body * body.lineHeight,
    color: colors.ink,
  },
  bodyMedium: {
    fontFamily: body.fontFamily.medium,
    fontSize: body.sizes.body,
    lineHeight: body.sizes.body * body.lineHeight,
    color: colors.ink,
  },
  small: {
    fontFamily: body.fontFamily.regular,
    fontSize: body.sizes.small,
    lineHeight: body.sizes.small * body.lineHeight,
    color: colors.muted,
  },
  caption: {
    fontFamily: body.fontFamily.regular,
    fontSize: body.sizes.caption,
    color: colors.muted,
  },
  error: {
    fontFamily: body.fontFamily.regular,
    fontSize: body.sizes.small,
    lineHeight: body.sizes.small * body.lineHeight,
    color: colors.alert,
  },
});
