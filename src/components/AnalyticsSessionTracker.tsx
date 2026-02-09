import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { trackSession } from "@/lib/analytics";

export function AnalyticsSessionTracker() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    trackSession({
      userId: user?.id ?? null,
      path: `${location.pathname}${location.search}`,
    });
  }, [location.pathname, location.search, user?.id]);

  return null;
}
