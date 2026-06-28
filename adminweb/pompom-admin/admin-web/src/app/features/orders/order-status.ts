import { OrderStatus } from '../../core/models/models';

// Nhãn tiếng Việt cho từng trạng thái đơn (khớp enum backend)
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  paid: 'Đã thanh toán',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
};

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: ORDER_STATUS_LABELS['pending'] },
  { value: 'paid', label: ORDER_STATUS_LABELS['paid'] },
  { value: 'preparing', label: ORDER_STATUS_LABELS['preparing'] },
  { value: 'shipping', label: ORDER_STATUS_LABELS['shipping'] },
  { value: 'delivered', label: ORDER_STATUS_LABELS['delivered'] },
  { value: 'cancelled', label: ORDER_STATUS_LABELS['cancelled'] }
];

// Trạng thái cuối — không cho đổi tiếp (khớp guard ở backend)
export const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled'];
