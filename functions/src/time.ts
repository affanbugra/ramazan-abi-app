// Gün hesapları Europe/Istanbul saatine göre (PROJE.md 8)
const DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Örn. "2026-10-21" */
export function istanbulDate(date: Date): string {
  return DATE_FORMAT.format(date);
}

const HOUR_FORMAT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hourCycle: 'h23' });

/** İstanbul saatine göre "08".."23" */
export function istanbulHour(date: Date): string {
  return HOUR_FORMAT.format(date).padStart(2, '0');
}
