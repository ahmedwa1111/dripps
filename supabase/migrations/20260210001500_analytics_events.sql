-- Create analytics events table for funnel tracking
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  path TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX analytics_events_type_idx ON public.analytics_events (event_type);
CREATE INDEX analytics_events_occurred_at_idx ON public.analytics_events (occurred_at);
CREATE INDEX analytics_events_session_idx ON public.analytics_events (session_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view analytics events" ON public.analytics_events
  FOR SELECT USING (public.is_staff(auth.uid()));
