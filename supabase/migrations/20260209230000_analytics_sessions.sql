-- Create analytics sessions table for visitor tracking
CREATE TABLE public.analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  path TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX analytics_sessions_started_at_idx ON public.analytics_sessions (started_at);

ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics sessions" ON public.analytics_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view analytics sessions" ON public.analytics_sessions
  FOR SELECT USING (public.is_staff(auth.uid()));
