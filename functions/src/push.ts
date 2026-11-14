// Expo Push yardımcısı (PROJE.md 8.9). Push hatası asla ana işlemi bozmaz: her şey try/catch + log.
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import type { OrderDoc, UserDoc } from './models';

const expo = new Expo();

export type PushType = 'new_order' | 'order_cancelled' | 'order_status' | 'eta_extended' | 'message';

export interface PushContent {
  title: string;
  body: string;
  type: PushType;
  orderId: string;
  /** Android kanalı: öğrenciye 'orders', kantinciye 'new-orders' */
  channelId: 'orders' | 'new-orders';
}

interface Recipient {
  uid: string;
  tokens: string[];
}

const BODY_MAX = 120;

export function truncate(text: string, max = BODY_MAX): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** "Ahmet Yılmaz" → "Ahmet Y." */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? '';
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

/** "2× Tost (Kaşarlı), 1× Patso" */
export function itemsSummary(order: Pick<OrderDoc, 'items'>): string {
  return order.items
    .map((i) => (i.variantName === 'Standart' ? `${i.qty}× ${i.productName}` : `${i.qty}× ${i.productName} (${i.variantName})`))
    .join(', ');
}

export async function adminRecipients(): Promise<Recipient[]> {
  const snap = await getFirestore().collection('users').where('role', '==', 'admin').get();
  return snap.docs.map((d) => ({ uid: d.id, tokens: (d.data() as UserDoc).pushTokens ?? [] }));
}

export async function userRecipient(uid: string): Promise<Recipient[]> {
  const snap = await getFirestore().doc(`users/${uid}`).get();
  if (!snap.exists) return [];
  return [{ uid, tokens: (snap.data() as UserDoc).pushTokens ?? [] }];
}

export async function sendPush(recipients: Recipient[], content: PushContent): Promise<void> {
  try {
    const owners: { uid: string; token: string }[] = [];
    const messages: ExpoPushMessage[] = [];
    for (const r of recipients) {
      for (const token of new Set(r.tokens)) {
        if (!Expo.isExpoPushToken(token)) continue;
        owners.push({ uid: r.uid, token });
        messages.push({
          to: token,
          title: content.title,
          body: truncate(content.body),
          data: { type: content.type, orderId: content.orderId },
          sound: 'default',
          priority: 'high',
          channelId: content.channelId,
        });
      }
    }
    if (messages.length === 0) return;

    let index = 0;
    const stale: { uid: string; token: string }[] = [];
    for (const chunk of expo.chunkPushNotifications(messages)) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        const owner = owners[index + i];
        if (ticket.status === 'error') {
          logger.warn('Push gönderilemedi', { error: ticket.details?.error, message: ticket.message });
          if (ticket.details?.error === 'DeviceNotRegistered' && owner) stale.push(owner);
        }
      });
      index += chunk.length;
    }

    // Uygulaması silinmiş / izni kapatılmış cihazların token'ları temizlenir
    await Promise.all(
      stale.map(({ uid, token }) =>
        getFirestore().doc(`users/${uid}`).update({ pushTokens: FieldValue.arrayRemove(token) }),
      ),
    );
  } catch (err) {
    logger.error('Push hatası', { err });
  }
}
