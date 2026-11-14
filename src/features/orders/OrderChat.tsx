import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PaperPlaneRight } from 'phosphor-react-native';
import { clearUnread, MESSAGE_MAX, sendMessage, useMessages } from '@/features/orders/chat';
import type { OrderDoc, WithId } from '@/types/models';
import { formatTime } from '@/utils/format';
import { colors, rounded, spacing, typography } from '@/theme/tokens';
import { text } from '@/theme/text';

interface OrderChatProps {
  order: WithId<OrderDoc>;
  viewerId: string;
  viewer: 'user' | 'admin';
}

/** Sipariş içi mini sohbet (PROJE.md 6.4): kendi mesajların sağda tea, karşı taraf solda surface. */
export function OrderChat({ order, viewerId, viewer }: OrderChatProps) {
  const { items: messages, loading } = useMessages(order.id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const open = order.status === 'pending' || order.status === 'preparing' || order.status === 'ready';
  const unread = viewer === 'user' ? order.unreadForUser : order.unreadForAdmin;

  // Ekran açıkken gelen mesajlar okunmuş sayılır
  useEffect(() => {
    if (unread > 0) clearUnread(order.id, viewer).catch(() => undefined);
  }, [order.id, unread, viewer]);

  const send = async () => {
    const clean = draft.trim();
    if (!clean || sending) return;
    setSending(true);
    try {
      await sendMessage(order.id, viewerId, viewer, clean);
      setDraft('');
    } catch {
      Alert.alert('Mesaj gönderilemedi', open ? 'İnternet bağlantını kontrol edip tekrar dene.' : 'Sipariş kapandı.');
    }
    setSending(false);
  };

  const other = viewer === 'user' ? 'Ramazan abi' : order.userName;

  return (
    <View style={styles.container}>
      <Text style={[text.bodyMedium, styles.title]}>Mesajlar</Text>
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : messages.length === 0 ? (
        <Text style={text.small}>
          {open ? `${other} ile buradan yazışabilirsin.` : 'Bu siparişte mesaj yok.'}
        </Text>
      ) : (
        <View style={styles.list}>
          {messages.map((m) => {
            const mine = m.senderRole === viewer;
            return (
              <View key={m.id} style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowOther]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{m.text}</Text>
                </View>
                {m.createdAt ? <Text style={[text.caption, styles.time]}>{formatTime(m.createdAt)}</Text> : null}
              </View>
            );
          })}
        </View>
      )}

      {open ? (
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={viewer === 'user' ? 'Ramazan abiye yaz' : 'Mesaj yaz'}
            placeholderTextColor={colors.placeholder}
            maxLength={MESSAGE_MAX}
            multiline
            style={styles.input}
            accessibilityLabel="Mesaj"
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || sending}
            style={({ pressed }) => [styles.send, (!draft.trim() || sending) && styles.sendDisabled, pressed && styles.sendPressed]}
            accessibilityRole="button"
            accessibilityLabel="Gönder"
          >
            {sending ? <ActivityIndicator color={colors.onTea} /> : <PaperPlaneRight size={22} color={colors.onTea} />}
          </Pressable>
        </View>
      ) : (
        <Text style={[text.small, styles.closed]}>Sipariş kapandı</Text>
      )}
    </View>
  );
}

const SEND = 48;

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.xs,
  },
  bubbleRow: {
    maxWidth: '82%',
  },
  rowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  rowOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: rounded.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bubbleMine: {
    backgroundColor: colors.tea,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
  },
  bubbleText: {
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.body,
    lineHeight: typography.body.sizes.body * typography.body.lineHeight,
    color: colors.ink,
  },
  bubbleTextMine: {
    color: colors.onTea,
  },
  time: {
    marginTop: spacing.xxs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: SEND,
    maxHeight: 120,
    borderRadius: rounded.input,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    fontFamily: typography.body.fontFamily.regular,
    fontSize: typography.body.sizes.body,
    color: colors.ink,
  },
  send: {
    width: SEND,
    height: SEND,
    borderRadius: rounded.pill,
    backgroundColor: colors.tea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.45,
  },
  sendPressed: {
    backgroundColor: colors.teaPressed,
  },
  closed: {
    marginTop: spacing.md,
  },
});
