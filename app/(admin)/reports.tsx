import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '@/components/ui';
import { RANGE_OPTIONS, summarize, useDailyStats, type ReportRange } from '@/features/reports/api';
import { formatPrice } from '@/utils/format';
import { colors, layout, rounded, spacing } from '@/theme/tokens';
import { text } from '@/theme/text';

const HOUR_BAR_MAX = 96;

function StatRow({ label, value, tone }: { label: string; value: string; tone?: 'alert' }) {
  return (
    <View style={styles.statRow}>
      <Text style={[text.body, styles.flex]}>{label}</Text>
      <Text style={[text.bodyMedium, tone === 'alert' && styles.alertText]}>{value}</Text>
    </View>
  );
}

/** Raporlar (PROJE.md 7.5): tek büyük sayı (ciro) öne çıkar; 4 eş kutulu KPI ızgarası yok. */
export default function ReportsScreen() {
  const [range, setRange] = useState<ReportRange>('today');
  const { items, loading, error } = useDailyStats(range);
  const report = summarize(items);
  const topMax = Math.max(1, ...report.topProducts.map((p) => p.qty));
  const hourMax = Math.max(1, ...report.byHour.map((h) => h.count));

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[text.displayL, styles.title]} accessibilityRole="header">
          Raporlar
        </Text>
        <View style={styles.ranges} accessibilityRole="tablist">
          {RANGE_OPTIONS.map((r) => (
            <Chip key={r.key} label={r.label} selected={range === r.key} onPress={() => setRange(r.key)} />
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.ink} style={styles.status} />
        ) : error ? (
          <Text style={[text.error, styles.status]}>Raporlar yüklenemedi. İnternet bağlantını kontrol et.</Text>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={text.small}>Tahmini ciro</Text>
              <Text style={styles.heroNumber} accessibilityLabel={`Tahmini ciro ${formatPrice(report.revenue)}`}>
                {formatPrice(report.revenue)}
              </Text>
              <Text style={text.body}>{report.delivered} sipariş teslim edildi</Text>
            </View>

            <View style={styles.section}>
              <StatRow
                label="Ortalama hazırlama süresi"
                value={report.avgPrepMinutes !== null ? `${report.avgPrepMinutes} dk` : '—'}
              />
              <StatRow label="İptal edilen" value={String(report.cancelled)} />
              <StatRow label="Reddedilen" value={String(report.rejected)} />
              <StatRow label="Gelmedi" value={String(report.noShow)} tone={report.noShow > 0 ? 'alert' : undefined} />
            </View>

            <Text style={[text.displayM, styles.sectionTitle]}>En çok satanlar</Text>
            {report.topProducts.length === 0 ? (
              <Text style={text.small}>Bu aralıkta teslim edilen sipariş yok.</Text>
            ) : (
              report.topProducts.map((p) => (
                <View key={p.id} style={styles.topRow} accessible accessibilityLabel={`${p.name}, ${p.qty} adet`}>
                  <View style={styles.topLabels}>
                    <Text style={[text.body, styles.flex]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={text.bodyMedium}>{p.qty} adet</Text>
                  </View>
                  <View style={styles.topTrack}>
                    <View style={[styles.topFill, { width: `${(p.qty / topMax) * 100}%` }]} />
                  </View>
                </View>
              ))
            )}

            <Text style={[text.displayM, styles.sectionTitle]}>Saatlere göre</Text>
            <View style={styles.hours} accessibilityLabel="Saatlere göre teslim edilen sipariş sayısı">
              {report.byHour.map((h) => (
                <View key={h.hour} style={styles.hourCol} accessible accessibilityLabel={`Saat ${h.hour}, ${h.count} sipariş`}>
                  <Text style={[text.caption, styles.hourCount]}>{h.count > 0 ? h.count : ''}</Text>
                  <View style={[styles.hourBar, { height: Math.max(2, (h.count / hourMax) * HOUR_BAR_MAX) }, h.count === 0 && styles.hourBarEmpty]} />
                  <Text style={[text.caption, styles.hourLabel]}>{Number(h.hour) % 2 === 0 ? h.hour : ''}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  content: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  title: {
    marginBottom: spacing.md,
  },
  ranges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  status: {
    paddingVertical: spacing.xl,
  },
  hero: {
    marginTop: spacing.xl,
  },
  heroNumber: {
    ...text.displayXl,
    color: colors.ink,
  },
  section: {
    marginTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  alertText: {
    color: colors.alert,
  },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  topRow: {
    marginBottom: spacing.sm,
  },
  topLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxs,
  },
  topTrack: {
    height: 10,
    borderRadius: rounded.pill,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  topFill: {
    height: '100%',
    borderRadius: rounded.pill,
    backgroundColor: colors.ink,
  },
  hours: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  hourCol: {
    flex: 1,
    alignItems: 'center',
  },
  hourCount: {
    marginBottom: spacing.xxs,
  },
  hourBar: {
    width: '100%',
    borderRadius: spacing.xxs,
    backgroundColor: colors.ink,
  },
  hourBarEmpty: {
    backgroundColor: colors.hairline,
  },
  hourLabel: {
    marginTop: spacing.xxs,
  },
});
