// Girdi normalizasyonu. İstemcideki src/utils/format.ts ile aynı kurallar.

export const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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
