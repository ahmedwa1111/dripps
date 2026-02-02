-- Run this in Supabase Dashboard: SQL Editor → New query → Paste → Run
-- Adds per-product shipping price (L.E.) so admin can set it when adding/editing products.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS shipping_price DECIMAL(10,2) NULL;

COMMENT ON COLUMN public.products.shipping_price IS 'Shipping price in L.E. for this product. When NULL, site default is used at checkout.';
