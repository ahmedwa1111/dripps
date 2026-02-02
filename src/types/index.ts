export type AppRole = 'admin' | 'manager' | 'customer';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

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
  total: number;
  subtotal: number;
  shipping_cost: number;
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
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  revenueChange: number;
  ordersChange: number;
}
