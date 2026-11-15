import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { orderIdFromResponse, registerPushToken, requestIfUndetermined } from '@/lib/notifications';
import type { UserRole } from '@/types/models';

interface NotificationBridgeProps {
  uid: string;
  role: UserRole;
}

/**
 * Giriş yapmış ve aktif kullanıcı için: her açılışta token'ı yeniler (değişmiş olabilir)
 * ve bildirime dokunulunca ilgili siparişi açar. Uygulama kapalıyken dokunulan bildirim de
 * useLastNotificationResponse ile yakalanır.
 */
export function NotificationBridge({ uid, role }: NotificationBridgeProps) {
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    // İzin hiç sorulmadıysa açılışta sorulur; verildiyse token kaydedilir
    requestIfUndetermined(uid)
      .then(() => registerPushToken(uid))
      .catch(() => undefined);
    // Ayarlardan bildirimi açıp geri dönen kullanıcının token'ı da kaydedilsin
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') registerPushToken(uid).catch(() => undefined);
    });
    return () => sub.remove();
  }, [uid]);

  useEffect(() => {
    if (!lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const orderId = orderIdFromResponse(lastResponse);
    if (!orderId) return;
    // Yönlendirme, kök Stack hazır olduktan sonra
    setTimeout(() => {
      router.push(
        role === 'admin'
          ? { pathname: '/(admin)/order/[id]', params: { id: orderId } }
          : { pathname: '/(student)/order/[id]', params: { id: orderId } },
      );
    }, 300);
  }, [lastResponse, role]);

  return null;
}
