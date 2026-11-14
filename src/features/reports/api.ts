import dayjs from 'dayjs';
import { orderBy, query, where } from 'firebase/firestore';
import { typedCollection } from '@/lib/firebase';
import { useLiveCollection } from '@/lib/useFirestore';
import type { DailyStats } from '@/types/models';

export type ReportRange = 'today' | 'week' | 'month';

export const RANGE_OPTIONS: { key: ReportRange; label: string; days: number }[] = [
  { key: 'today', label: 'Bugün', days: 1 },
  { key: 'week', label: 'Son 7 gün', days: 7 },
  { key: 'month', label: 'Son 30 gün', days: 30 },
];

/** dailyStats doküman id'leri İstanbul tarihi; cihaz saati İstanbul varsayılır. */
function startDate(range: ReportRange): string {
  const days = RANGE_OPTIONS.find((r) => r.key === range)?.days ?? 1;
  return dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD');
}

export function useDailyStats(range: ReportRange) {
  const start = startDate(range);
  return useLiveCollection(`stats-${start}`, () =>
    query(typedCollection<DailyStats>('dailyStats'), where('date', '>=', start), orderBy('date')),
  );
}

export interface ReportSummary {
  delivered: number;
  revenue: number;
  cancelled: number;
  rejected: number;
  noShow: number;
  avgPrepMinutes: number | null;
  topProducts: { id: string; name: string; qty: number; revenue: number }[];
  byHour: { hour: string; count: number }[];
}

export const REPORT_HOURS = Array.from({ length: 16 }, (_, i) => String(i + 8).padStart(2, '0')); // 08..23

export function summarize(days: Partial<DailyStats>[]): ReportSummary {
  let delivered = 0;
  let revenue = 0;
  let cancelled = 0;
  let rejected = 0;
  let noShow = 0;
  let prepSum = 0;
  let prepCount = 0;
  const products = new Map<string, { name: string; qty: number; revenue: number }>();
  const hours = new Map<string, number>();

  for (const d of days) {
    delivered += d.delivered ?? 0;
    revenue += d.revenue ?? 0;
    cancelled += d.cancelled ?? 0;
    rejected += d.rejected ?? 0;
    noShow += d.noShow ?? 0;
    prepSum += d.prepMinutesSum ?? 0;
    prepCount += d.prepCount ?? 0;
    for (const [id, p] of Object.entries(d.byProduct ?? {})) {
      const prev = products.get(id);
      products.set(id, { name: p.name, qty: (prev?.qty ?? 0) + p.qty, revenue: (prev?.revenue ?? 0) + p.revenue });
    }
    for (const [hour, count] of Object.entries(d.byHour ?? {})) hours.set(hour, (hours.get(hour) ?? 0) + count);
  }

  return {
    delivered,
    revenue,
    cancelled,
    rejected,
    noShow,
    avgPrepMinutes: prepCount > 0 ? Math.round(prepSum / prepCount) : null,
    topProducts: [...products.entries()]
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5),
    byHour: REPORT_HOURS.map((hour) => ({ hour, count: hours.get(hour) ?? 0 })),
  };
}
