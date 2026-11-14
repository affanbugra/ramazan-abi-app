// PROJE.md Bölüm 5 — istemcideki src/types/models.ts ile AYNI tutulmalı.
// Fark sadece Timestamp tipinin firebase-admin'den gelmesi.
import type { Timestamp } from 'firebase-admin/firestore';

export type UserRole = 'student' | 'admin';
export type UserStatus = 'active' | 'suspended';
export interface UserDoc {
  name: string;
  email: string;
  phone: string;
  photoURL: string | null;
  role: UserRole;
  status: UserStatus;
  inviteCode: string | null;
  pushTokens: string[];
  orderCount: number;
  noShowCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type InviteStatus = 'active' | 'used' | 'revoked';
export interface InviteDoc {
  code: string;
  label: string;
  status: InviteStatus;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  usedBy: string | null;
  usedByName: string | null;
  usedAt: Timestamp | null;
  revokedAt: Timestamp | null;
}

export interface CategoryDoc {
  name: string;
  order: number;
  imageUrl: string | null;
  placeholderIcon: string;
  updatedAt: Timestamp;
}

export interface Variant {
  id: string;
  name: string;
  price: number;
  available: boolean;
}
export interface ProductDoc {
  categoryId: string;
  name: string;
  order: number;
  imageUrl: string | null;
  typicalPrepMin: number | null;
  available: boolean;
  variants: Variant[];
  updatedAt: Timestamp;
}

export type BusyLevel = 'calm' | 'normal' | 'busy';
export interface ShopSettings {
  isOpen: boolean;
  prayerBreak?: boolean; // namaz arası: kantin açık ama yeni sipariş alınmaz (eski dokümanda yok = false)
  teaReady?: boolean; // çay demlendi mi (sadece bilgi)
  busyLevel: BusyLevel;
  maxActiveOrders: number;
  updatedAt: Timestamp;
  updatedBy: string;
}

export type StockGroup = 'ekmek' | 'et' | 'kahvaltilik' | 'sebze' | 'donuk' | 'diger';
export interface StockItemDoc {
  name: string;
  group: StockGroup;
  level: number; // 0-100 (%20 altı kırmızı + Alınacaklar, %20-50 turuncu, %50 üstü yeşil)
  order: number;
  updatedAt: Timestamp;
  updatedBy: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'no_show' | 'cancelled' | 'rejected';
export const OPEN_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready'];
export const QUEUE_STATUSES: OrderStatus[] = ['pending', 'preparing'];
export interface OrderItem {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  unitPrice: number;
  qty: number;
  note: string | null;
}
export interface OrderDoc {
  orderNo: number;
  userId: string;
  userName: string;
  userPhone: string | null;
  items: OrderItem[];
  note: string | null;
  total: number;
  status: OrderStatus;
  queuePos: number;
  etaMinutes: number | null;
  etaAt: Timestamp | null;
  rejectReason: string | null;
  cancelledBy: 'user' | null;
  createdAt: Timestamp;
  acceptedAt: Timestamp | null;
  readyAt: Timestamp | null;
  closedAt: Timestamp | null;
  updatedAt: Timestamp;
  unreadForUser: number;
  unreadForAdmin: number;
  lastMessageAt: Timestamp | null;
  statsApplied: boolean;
}

export interface QueueDoc {
  ids: string[];
  updatedAt: Timestamp;
}

export interface MessageDoc {
  senderId: string;
  senderRole: 'user' | 'admin';
  text: string;
  createdAt: Timestamp;
}
