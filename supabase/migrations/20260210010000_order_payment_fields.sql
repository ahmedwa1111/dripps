-- Add payment tracking fields to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER NOT NULL DEFAULT 0;

UPDATE public.orders
SET
  total_amount_cents = COALESCE(total_amount_cents, 0) + CASE
    WHEN total_amount_cents = 0 THEN ROUND(COALESCE(total, 0) * 100)
    ELSE 0
  END,
  payment_status = COALESCE(payment_status, 'unpaid')
WHERE total_amount_cents = 0 OR payment_status IS NULL;
