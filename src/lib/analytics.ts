import { supabase } from "@/integrations/supabase/client";

const SESSION_ID_KEY = "drippss_session_id";
const SESSION_LAST_SEEN_KEY = "drippsss_session_last_seen";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export type SessionTrackingPayload = {
  session_id: string;
  user_id?: string | null;
  started_at: string;
  last_seen_at?: string | null;
  path?: string | null;
  referrer?: string | null;
  user_agent?: string | null;
};

export type AnalyticsEventPayload = {
  event_type: string;
  session_id: string;
  user_id?: string | null;
  occurred_at: string;
  path?: string | null;
  product_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

const getStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const generateSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

const recordSession = async (payload: SessionTrackingPayload) => {
  try {
    const { error } = await supabase
      .from("analytics_sessions")
      .upsert(payload, { onConflict: "session_id", ignoreDuplicates: true });

    if (error) {
      console.warn("Analytics session insert failed", error.message);
    }
  } catch (error) {
    console.warn("Analytics session insert failed", error);
  }
};

const ensureSession = (options?: { userId?: string | null; path?: string }) => {
  if (typeof window === "undefined") return null;

  const storage = getStorage();
  if (!storage) return null;

  const now = Date.now();
  const lastSeen = Number(storage.getItem(SESSION_LAST_SEEN_KEY) || 0);
  let sessionId = storage.getItem(SESSION_ID_KEY);
  const isExpired = !sessionId || !lastSeen || now - lastSeen > SESSION_TIMEOUT_MS;

  if (isExpired) {
    sessionId = generateSessionId();
    storage.setItem(SESSION_ID_KEY, sessionId);
  }

  storage.setItem(SESSION_LAST_SEEN_KEY, String(now));

  if (isExpired && sessionId) {
    void recordSession({
      session_id: sessionId,
      user_id: options?.userId ?? null,
      started_at: new Date(now).toISOString(),
      last_seen_at: new Date(now).toISOString(),
      path: options?.path ?? `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    });
  }

  return sessionId;
};

export const trackSession = (options?: { userId?: string | null; path?: string }) => {
  ensureSession(options);
};

export const trackEvent = (
  eventType: string,
  options?: { userId?: string | null; path?: string; productId?: string | null; metadata?: Record<string, unknown> }
) => {
  if (typeof window === "undefined") return;

  const sessionId = ensureSession({ userId: options?.userId, path: options?.path });
  if (!sessionId) return;

  const payload: AnalyticsEventPayload = {
    event_type: eventType,
    session_id: sessionId,
    user_id: options?.userId ?? null,
    occurred_at: new Date().toISOString(),
    path: options?.path ?? `${window.location.pathname}${window.location.search}`,
    product_id: options?.productId ?? null,
    metadata: options?.metadata ?? null,
  };

  supabase
    .from("analytics_events")
    .insert(payload)
    .then(({ error }) => {
      if (error) {
        console.warn("Analytics event insert failed", error.message);
      }
    })
    .catch((error) => {
      console.warn("Analytics event insert failed", error);
    });
};
