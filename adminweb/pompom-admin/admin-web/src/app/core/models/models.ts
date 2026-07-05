// Các interface khớp với 35 Mongoose schema ở backend (chỉ khai báo field thực sự dùng ở admin)

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DashboardSummary {
  totalRevenue: number;
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  totalUsers: number;
  newUsersLast30Days: number;
  todayOrders: number;
  todayRevenue: number;
  totalProducts: number;
}

export interface TopCustomer {
  userId: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  orderCount: number;
  totalSpent: number;
}

export interface RevenuePoint {
  period: string;
  revenue: number;
  orders: number;
}

export interface RevenueReport {
  groupBy: 'day' | 'week' | 'month';
  data: RevenuePoint[];
}

export interface TopProduct {
  productId: string;
  name: string;
  price: number;
  totalQuantity: number;
  totalRevenue: number;
  image_url: string | null;
}

export interface SearchKeyword {
  keyword: string;
  count: number;
}

export interface UserBehaviorReport {
  totalProductViews: number;
  topSearches: SearchKeyword[];
  deliveredOrders: number;
  engagedUsers: number;
  conversionRate: number;
}

export interface Banner {
  _id: string;
  title: string;
  image_url: string;
  target_type?: string;
  target_id?: string;
  target_url?: string;
  sort_order?: number;
  is_active: boolean;
}

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface User {
  _id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  avatar_url?: string;
  bio?: string;
  role: 'user' | 'admin';
  status: 'active' | 'locked';
  gender?: 'male' | 'female' | 'other';
  skin_type?: string;
  join_date?: string;
  last_login?: string;
  created_at?: string;
  order_count?: number;
  total_spent?: number;
}

export interface UserAddress {
  _id: string;
  label?: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city?: string;
  district?: string;
  ward?: string;
  is_default: boolean;
}

export interface UserDetail extends User {
  addresses: UserAddress[];
  orders: Order[];
}

export interface Category {
  _id: string;
  category_name: string;
  parent_id?: string | { _id: string; category_name: string } | null;
  sort_order?: number;
  image_url?: string;
  product_count?: number;
}

export interface Voucher {
  _id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_amount?: number;
  max_discount?: number;
  start_date: string;
  end_date: string;
  usage_limit?: number;
  used_count?: number;
  is_active: boolean;
  assignedCount?: number;
}

export interface ProductImage {
  _id: string;
  product_id: string;
  image_url: string;
  sort_order?: number;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  sale_price?: number | null;
  stock?: number;
  sku: string;
  category_id: string | Category;
  brand?: string;
  is_active: boolean;
  images?: ProductImage[];
  sold?: number;
  created_at?: string;
}

export interface Order {
  _id: string;
  order_number: string;
  user_id?: { _id: string; full_name: string; email: string } | string | null;
  address_id?: UserAddress | string | null;
  total_amount: number;
  shipping_fee: number;
  discount_amount: number;
  final_amount: number;
  status: OrderStatus;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  shipping_carrier?: string;
  tracking_number?: string;
  note?: string;
  created_at: string;
  item_count?: number;
  item_qty?: number;
}

export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipping' | 'delivered' | 'returned' | 'cancelled';

export interface OrderItem {
  _id: string;
  product_id?: { _id: string; name: string } | string;
  quantity: number;
  price: number;
}

export interface OrderStatusHistory {
  _id: string;
  status: OrderStatus;
  note?: string;
  created_at: string;
}

export interface Payment {
  _id: string;
  transaction_id?: string;
  amount: number;
  status: string;
  payment_method: string;
  paid_at?: string;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
  history: OrderStatusHistory[];
  payment: Payment | null;
}

export interface CommunityPost {
  _id: string;
  user_id?: { _id: string; full_name: string; email?: string; avatar_url?: string } | string;
  content: string;
  images?: string[];
  product_tag?: { _id: string; name: string } | string | null;
  post_type?: string;
  like_count: number;
  comment_count: number;
  is_hidden: boolean;
  created_at: string;
}

export interface Comment {
  _id: string;
  user_id?: { _id: string; full_name: string; avatar_url?: string } | string;
  parent_id?: string | null;
  content: string;
  created_at: string;
}

export interface PostDetail extends CommunityPost {
  comments: Comment[];
}
