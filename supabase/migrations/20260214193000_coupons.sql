-- Coupons + redemptions
CREATE TYPE public.coupon_type AS ENUM ('percentage', 'fixed');

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  type public.coupon_type NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2),
  max_discount_amount NUMERIC(10,2),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  usage_limit_total INTEGER,
  usage_limit_per_user INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  apply_to_all BOOLEAN NOT NULL DEFAULT true,
  applicable_product_ids UUID[],
  applicable_category_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_code_uppercase CHECK (code = upper(code)),
  ADD CONSTRAINT coupons_code_no_spaces CHECK (code !~ '\\s'),
  ADD CONSTRAINT coupons_value_positive CHECK (value > 0),
  ADD CONSTRAINT coupons_percentage_range CHECK (
    (type = 'percentage' AND value > 0 AND value <= 100) OR type = 'fixed'
  ),
  ADD CONSTRAINT coupons_percentage_max_only CHECK (
    type = 'percentage' OR max_discount_amount IS NULL
  ),
  ADD CONSTRAINT coupons_limits_nonnegative CHECK (
    (usage_limit_total IS NULL OR usage_limit_total >= 0)
    AND (usage_limit_per_user IS NULL OR usage_limit_per_user >= 0)
  ),
  ADD CONSTRAINT coupons_scope_present CHECK (
    apply_to_all = true
    OR COALESCE(array_length(applicable_product_ids, 1), 0) > 0
    OR COALESCE(array_length(applicable_category_ids, 1), 0) > 0
  );

CREATE UNIQUE INDEX coupons_code_unique ON public.coupons (code);
CREATE INDEX coupons_active_idx ON public.coupons (is_active);
CREATE INDEX coupons_expires_at_idx ON public.coupons (expires_at);

CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, order_id)
);

ALTER TABLE public.coupon_redemptions
  ADD CONSTRAINT coupon_redemptions_discount_nonnegative CHECK (discount_amount >= 0);

CREATE INDEX coupon_redemptions_coupon_id_idx ON public.coupon_redemptions (coupon_id);
CREATE INDEX coupon_redemptions_user_id_idx ON public.coupon_redemptions (user_id);
CREATE INDEX coupon_redemptions_order_id_idx ON public.coupon_redemptions (order_id);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view coupons" ON public.coupons
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage coupons" ON public.coupons
  FOR ALL USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can view coupon redemptions" ON public.coupon_redemptions
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage coupon redemptions" ON public.coupon_redemptions
  FOR ALL USING (public.is_staff(auth.uid()));

CREATE TRIGGER set_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.increment_coupon_used_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_coupon_used_count
  AFTER INSERT ON public.coupon_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.increment_coupon_used_count();

ALTER TABLE public.orders
  ADD COLUMN coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN coupon_code TEXT,
  ADD COLUMN discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_discount_nonnegative CHECK (discount_amount >= 0);

ALTER TABLE public.pending_orders
  ADD COLUMN coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN coupon_code TEXT,
  ADD COLUMN discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.pending_orders
  ADD CONSTRAINT pending_orders_discount_nonnegative CHECK (discount_amount >= 0);
