export type AppRole = 'admin' | 'manager' | 'customer';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type CouponType = 'percentage' | 'fixed';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductSize {
  id: string;
  product_id: string;
  size: string;
  stock: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  images: string[];
  colors?: string[] | null;
  category_id: string | null;
  stock: number;
  is_featured: boolean;
  is_active: boolean;
  shipping_price: number | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  sizes?: ProductSize[];
}

export interface Order {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  payment_method: string | null;
  payment_status: string | null;
  transaction_id: string | null;
  paid_at: string | null;
  total_amount_cents: number;
  total: number;
  subtotal: number;
  shipping_cost: number;
  discount_amount?: number;
  coupon_id?: string | null;
  coupon_code?: string | null;
  shipping_address: Address | null;
  billing_address: Address | null;
  customer_email: string | null;
  customer_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit_total: number | null;
  usage_limit_per_user: number | null;
  used_count: number;
  is_active: boolean;
  apply_to_all: boolean;
  applicable_product_ids: string[] | null;
  applicable_category_ids: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  user_id: string | null;
  order_id: string;
  discount_amount: number;
  created_at: string;
}

export interface AppliedCoupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  discount_amount: number;
  eligible_subtotal: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  totalVisitors: number;
  revenueChange: number;
  ordersChange: number;
}
