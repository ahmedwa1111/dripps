-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'customer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10,2),
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order_status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_address JSONB,
  billing_address JSONB,
  customer_email TEXT,
  customer_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create has_role function (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_staff(auth.uid()));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Categories policies (public read, staff write)
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage categories" ON public.categories
  FOR ALL USING (public.is_staff(auth.uid()));

-- Products policies (public read active, staff full access)
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can view all products" ON public.products
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage products" ON public.products
  FOR ALL USING (public.is_staff(auth.uid()));

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all orders" ON public.orders
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage orders" ON public.orders
  FOR ALL USING (public.is_staff(auth.uid()));

-- Order items policies
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all order items" ON public.order_items
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage order items" ON public.order_items
  FOR ALL USING (public.is_staff(auth.uid()));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed categories
INSERT INTO public.categories (name, slug, description, image_url) VALUES
  ('Tops & more', 'tops-and-more', 'Urban street fashion essentials', 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=800'),
  ('Leggings', 'leggings', 'Premium leggings collection', 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800'),
  ('Pants', 'pants', 'Comfortable pants and joggers', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800');

-- Seed products
INSERT INTO public.products (name, slug, description, price, compare_at_price, image_url, category_id, stock, is_featured) VALUES
  ('Drip Hoodie Classic', 'drip-hoodie-classic', 'Premium cotton blend hoodie with signature Drippss embroidery. Ultra-soft interior, relaxed fit.', 89.99, 129.99, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800', (SELECT id FROM public.categories WHERE slug = 'tops-and-more'), 50, true),
  ('Urban Runner X', 'urban-runner-x', 'Lightweight performance leggings with memory foam comfort. Perfect for all-day wear.', 149.99, NULL, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', (SELECT id FROM public.categories WHERE slug = 'leggings'), 30, true),
  ('Jogger Pants Elite', 'jogger-pants-elite', 'Premium jogger pants with tapered fit. Comfortable elastic waistband.', 189.99, 249.99, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800', (SELECT id FROM public.categories WHERE slug = 'pants'), 25, true),
  ('Signature Tee', 'signature-tee', '100% organic cotton t-shirt with oversized fit. Screen-printed Drippss logo.', 39.99, NULL, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', (SELECT id FROM public.categories WHERE slug = 'tops-and-more'), 200, true),
  ('Retro High Tops', 'retro-high-tops', 'Classic high-waist leggings with modern twist. Stretchy fabric, comfortable fit.', 119.99, 159.99, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800', (SELECT id FROM public.categories WHERE slug = 'leggings'), 45, true),
  ('Cargo Pants Pro', 'cargo-pants-pro', 'Lightweight cargo pants with multiple pockets. Perfect for everyday wear.', 219.99, 299.99, 'https://images.unsplash.com/photo-1544923246-77307dd628b8?w=800', (SELECT id FROM public.categories WHERE slug = 'pants'), 20, true),
  ('Crop Top Essential', 'crop-top-essential', 'Fitted crop top with ribbed texture. Perfect for layering or wearing solo.', 45.99, 59.99, 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800', (SELECT id FROM public.categories WHERE slug = 'tops-and-more'), 150, true),
  ('Oversized Graphic Tee', 'oversized-graphic-tee', 'Relaxed fit graphic tee with bold Drippss print. Soft cotton blend.', 49.99, NULL, 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800', (SELECT id FROM public.categories WHERE slug = 'tops-and-more'), 120, false);