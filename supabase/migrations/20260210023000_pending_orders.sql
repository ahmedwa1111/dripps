-- Store pending card orders until payment succeeds
CREATE TABLE public.pending_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  notes TEXT,
  shipping_address JSONB,
  billing_address JSONB,
  subtotal NUMERIC,
  shipping_cost NUMERIC,
  total NUMERIC,
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  payment_method TEXT DEFAULT 'card',
  order_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  paymob_order_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at TIMESTAMPTZ
);

CREATE INDEX pending_orders_status_idx ON public.pending_orders (status);
CREATE INDEX pending_orders_created_at_idx ON public.pending_orders (created_at);

ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;
