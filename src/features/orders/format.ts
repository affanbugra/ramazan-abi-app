import type { OrderDoc, OrderItem } from '@/types/models';

/** Liste satırı için kısa özet: "2× Tost, 1× Patso" */
export function orderSummary(order: Pick<OrderDoc, 'items'>): string {
  return order.items.map((i) => `${i.qty}× ${i.productName}`).join(', ');
}

/** Tek çeşitli üründe çeşit adı ("Standart") gösterilmez. */
export function itemLabel(item: OrderItem): string {
  return item.variantName === 'Standart' ? item.productName : `${item.productName}, ${item.variantName}`;
}

/** Kapanmış siparişin sonuç metni (PROJE.md 6.4). */
export function closedResultText(order: Pick<OrderDoc, 'status' | 'rejectReason'>): string | null {
  switch (order.status) {
    case 'delivered':
      return 'Teslim edildi';
    case 'rejected':
      return order.rejectReason ? `Reddedildi: ${order.rejectReason}` : 'Reddedildi';
    case 'cancelled':
      return 'İptal ettin';
    case 'no_show':
      return 'Gelmedin olarak işaretlendi';
    default:
      return null;
  }
}

/** Kart başlığı için kısa geçen süre: "az önce", "4 dk önce", "1 sa 5 dk önce" */
export function elapsedLabel(fromMs: number, nowMs: number): string {
  const minutes = Math.floor((nowMs - fromMs) / 60_000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} sa ${rest} dk önce` : `${hours} sa önce`;
}
