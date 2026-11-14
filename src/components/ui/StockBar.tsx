import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { levelTone, LEVEL_STEP, roundLevel } from '@/features/stock/api';
import { colors, rounded } from '@/theme/tokens';

export interface StockBarProps {
  level: number;
  label: string;
  /** Parmak kalkınca kaydedilecek değer (0-100) */
  onCommit: (level: number) => void;
}

const HEIGHT = 28;
const PENDING_TIMEOUT_MS = 4000;

const TONE_COLOR = { low: colors.alert, mid: colors.busy, ok: colors.fresh } as const;

/**
 * Yatay doluluk çubuğu (0-100). Yalnızca yatay sürükleme değeri değiştirir: dokunmak ya da
 * dikey kaydırmak bir şey yapmaz. Bırakılan değer, sunucudan aynı değer dönene kadar ekranda tutulur
 * (eski değere bir an geri sıçramasın).
 */
export const StockBar: React.FC<StockBarProps> = ({ level, label, onCommit }) => {
  const [width, setWidth] = useState(0);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  // Sunucudan bırakılan değer gelince ya da bir süre sonra beklemeyi bırak
  useEffect(() => {
    if (pending === null) return;
    if (level === pending) {
      setPending(null);
      return;
    }
    const timer = setTimeout(() => setPending(null), PENDING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [level, pending]);

  const shown = dragValue ?? pending ?? level;

  const pan = usePanGesture({
    runOnJS: true,
    // Yatay en az 10 px hareket etmeden etkinleşmez; dikey 8 px kayarsa iptal olur (liste kaydırması)
    activeOffsetX: [-10, 10],
    failOffsetY: [-8, 8],
    // Etkinleşince değer parmağın bulunduğu noktaya gider
    onUpdate: (e) => {
      if (width <= 0) return;
      const value = roundLevel((e.x / width) * 100);
      dragRef.current = value;
      setDragValue(value);
    },
    onFinalize: (e) => {
      const value = dragRef.current;
      dragRef.current = null;
      if (!e.canceled && value !== null && value !== level) {
        setPending(value);
        onCommit(value);
      }
      setDragValue(null);
    },
  });

  const tone = levelTone(shown);

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={styles.track}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: shown, text: `yüzde ${shown}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          const next = roundLevel(shown + (event.nativeEvent.actionName === 'increment' ? LEVEL_STEP * 2 : -LEVEL_STEP * 2));
          setPending(next);
          onCommit(next);
        }}
      >
        <View style={[styles.fill, { width: `${shown}%`, backgroundColor: TONE_COLOR[tone] }]} />
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  track: {
    flex: 1,
    height: HEIGHT,
    borderRadius: rounded.pill,
    backgroundColor: colors.hairline,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: rounded.pill,
  },
});
