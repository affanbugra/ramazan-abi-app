// avoid-ai-design-ignore-file: CP3 (bu dosyadaki "→" işaretleri arayüz metni değil, kod yorumundaki örnekler)
import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import type { Timestamp } from 'firebase/firestore';

dayjs.locale('tr');

// --- Girdi normalizasyonu (functions/src/validation.ts ile aynı kurallar) ---

const INVITE_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Büyük harfe çevirir, boşluk ve tireleri atar. */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

export function isValidInviteCode(code: string): boolean {
  return INVITE_CODE_RE.test(code);
}

/** "0532 123 45 67", "532...", "+90 532..." → "+905321234567"; geçersizse null. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  if (!/^5\d{9}$/.test(digits)) return null;
  return `+90${digits}`;
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function normalizeName(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function isValidName(name: string): boolean {
  return name.length >= 2 && name.length <= 40;
}

// --- Gösterim ---

/** "+905321234567" → "0532 123 45 67" */
export function formatPhone(e164: string): string {
  const d = e164.replace(/^\+90/, '');
  if (d.length !== 10) return e164;
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

/** 95 → "95 ₺", 1250 → "1.250 ₺" (binlik nokta) */
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('tr-TR')} ₺`;
}

/** Kalan süre: 3599000 → "59:59" */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** "21 Eki 14:02" */
export function formatDateTime(ts: Timestamp): string {
  return dayjs(ts.toDate()).format('D MMM HH:mm');
}

/** "14:02" */
export function formatTime(ts: Timestamp): string {
  return dayjs(ts.toDate()).format('HH:mm');
}
