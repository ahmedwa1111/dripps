import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export type CardSalesTimeseriesPoint = {
  date: string;
  salesCents: number;
  orders: number;
};

export type CardSalesResponse = {
  from: string;
  to: string;
  totalCardSalesCents: number;
  totalCardOrders: number;
  timeseries: CardSalesTimeseriesPoint[];
};

export function useCardSalesMetrics(range?: { from: string; to: string }) {
  const { session, isStaff } = useAuth();
  const token = session?.access_token;

  const fallbackTo = format(new Date(), "yyyy-MM-dd");
  const fallbackFrom = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const effectiveRange = range ?? { from: fallbackFrom, to: fallbackTo };

  return useQuery({
    queryKey: ["card-sales", effectiveRange],
    queryFn: async (): Promise<CardSalesResponse> => {
      if (!token) {
        throw new Error("Missing admin session");
      }

      const params = new URLSearchParams({
        from: effectiveRange.from,
        to: effectiveRange.to,
      });

      const resp = await fetch(`/api/admin/metrics/card-sales?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || "Failed to load card sales");
      }

      return data as CardSalesResponse;
    },
    enabled: isStaff && !!token,
    staleTime: 60 * 1000,
  });
}
