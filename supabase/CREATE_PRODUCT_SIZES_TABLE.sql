-- Run this in Supabase Dashboard: SQL Editor → New query → Paste → Run
-- Fixes: "Could not find the table 'public.product_sizes' in the schema cache"

-- Create product_sizes table for size-based inventory management
CREATE TABLE IF NOT EXISTS public.product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, size)
);

-- Enable RLS
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running (optional)
DROP POLICY IF EXISTS "Anyone can view product sizes" ON public.product_sizes;
DROP POLICY IF EXISTS "Staff can manage product sizes" ON public.product_sizes;

-- Public read access for product sizes
CREATE POLICY "Anyone can view product sizes"
  ON public.product_sizes FOR SELECT
  USING (true);

-- Staff can manage product sizes
CREATE POLICY "Staff can manage product sizes"
  ON public.product_sizes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Trigger to update updated_at (requires handle_updated_at to exist from your other migrations)
DROP TRIGGER IF EXISTS update_product_sizes_updated_at ON public.product_sizes;
CREATE TRIGGER update_product_sizes_updated_at
  BEFORE UPDATE ON public.product_sizes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed default sizes for existing products (optional)
INSERT INTO public.product_sizes (product_id, size, stock, is_enabled)
SELECT 
  p.id,
  s.size,
  CASE 
    WHEN s.size = 'M' THEN GREATEST(p.stock / 3, 5)
    WHEN s.size IN ('S', 'L') THEN GREATEST(p.stock / 4, 3)
    ELSE GREATEST(p.stock / 6, 2)
  END,
  true
FROM public.products p
CROSS JOIN (
  SELECT unnest(ARRAY['XS', 'S', 'M', 'L', 'XL']) AS size
) s
ON CONFLICT (product_id, size) DO NOTHING;
