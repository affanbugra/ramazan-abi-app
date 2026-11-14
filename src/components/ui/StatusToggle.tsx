import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, rounded, spacing, typography } from '@/theme/tokens';

export type StatusToggleTone = 'fresh' | 'busy' | 'alert' | 'neutral';

interface StatusToggleProps {
  label: string;
  on: boolean;
  onTone: StatusToggleTone;
  offTone: StatusToggleTone;
  accessibilityLabel: string;
  /** Yoksa salt gösterge (öğrenci tarafı) */
  onPress?: () => void;
  /** Kantin kapalıyken Namaz/Çay soluk durur */
  dimmed?: boolean;
  /** Öğrenci menüsünde başlık satırının sağı: içeriği kadar genişlik, daha küçük anahtar */
  compact?: boolean;
}

const TRACK_W = 40;
const TRACK_H = 24;
const COMPACT_TRACK_W = 34;
const COMPACT_TRACK_H = 20;
const COMPACT_INSET = 3; // küçük anahtarda topuzun kenar boşluğu

const TONES: Record<StatusToggleTone, { bg: string; fg: string; track: string }> = {
  fresh: { bg: colors.freshSoft, fg: colors.fresh, track: colors.fresh },
  busy: { bg: colors.busySoft, fg: colors.busy, track: colors.busy },
  alert: { bg: colors.alertSoft, fg: colors.alert, track: colors.alert },
  neutral: { bg: colors.surface, fg: colors.muted, track: colors.hairline },
};

/** Kantin durum anahtarı (Açık / Namaz / Çay): hap içinde etiket + elle çizilmiş anahtar. */
export function StatusToggle({ label, on, onTone, offTone, accessibilityLabel, onPress, dimmed, compact }: StatusToggleProps) {
  const tone = TONES[on ? onTone : offTone];
  const content = (
    <>
      <Text
        style={[styles.label, { color: tone.fg }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
      {/* Sistem Switch'i iOS 26'da kendi alanından büyük çiziliyor; iki platformda aynı ve hizalı olsun diye elle */}
      <View style={[styles.track, compact && styles.trackCompact, { backgroundColor: tone.track }]}>
        <View style={[styles.thumb, compact && styles.thumbCompact, on ? styles.thumbOn : styles.thumbOff]} />
      </View>
    </>
  );

  const style = [styles.pill, compact && styles.pillCompact, { backgroundColor: tone.bg }, dimmed && styles.dimmed];
  if (!onPress) {
    return (
      <View style={style} accessible accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && styles.pressed]}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={accessibilityLabel}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xxs,
    height: 44,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xxs,
    borderRadius: rounded.pill,
  },
  pillCompact: {
    flex: 0,
    flexShrink: 1,
    height: 36,
    gap: spacing.xs,
    paddingLeft: spacing.sm,
  },
  dimmed: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    flexShrink: 1,
    fontFamily: typography.body.fontFamily.semiBold,
    fontSize: typography.body.sizes.small,
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: rounded.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  trackCompact: {
    width: COMPACT_TRACK_W,
    height: COMPACT_TRACK_H,
    paddingHorizontal: COMPACT_INSET,
  },
  thumb: {
    width: TRACK_H - spacing.xs,
    height: TRACK_H - spacing.xs,
    borderRadius: rounded.pill,
    backgroundColor: colors.ground,
  },
  thumbCompact: {
    width: COMPACT_TRACK_H - COMPACT_INSET * 2,
    height: COMPACT_TRACK_H - COMPACT_INSET * 2,
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  thumbOff: {
    alignSelf: 'flex-start',
  },
});
