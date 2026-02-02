-- Add optional per-product shipping price (L.E.)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS shipping_price DECIMAL(10,2) NULL;

COMMENT ON COLUMN public.products.shipping_price IS 'Shipping price in L.E. for this product. When NULL, site default is used at checkout.';
