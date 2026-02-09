import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { addDays, differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const PRESET_LABELS = {
  "7d": "This Week",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  custom: "Custom",
} as const;

type RangePreset = keyof typeof PRESET_LABELS;

type EventRow = {
  session_id: string;
  event_type: string;
};

type FunnelCounts = {
  productViews: number;
  addToCart: number;
  checkoutStart: number;
  purchases: number;
  abandoned: number;
};

const EVENT_TYPES = ["product_view", "add_to_cart", "checkout_start", "purchase"] as const;

const formatRangeLabel = (from: string, to: string) => {
  try {
    return `${format(parseISO(from), "MMM d, yyyy")} - ${format(parseISO(to), "MMM d, yyyy")}`;
  } catch {
    return `${from} - ${to}`;
  }
};

const calculateConversionRate = (orders: number, views: number) =>
  views > 0 ? (orders / views) * 100 : 0;

const buildCounts = (rows: EventRow[]): FunnelCounts => {
  const sets: Record<string, Set<string>> = {
    product_view: new Set(),
    add_to_cart: new Set(),
    checkout_start: new Set(),
    purchase: new Set(),
  };

  rows.forEach((row) => {
    if (sets[row.event_type]) {
      sets[row.event_type].add(row.session_id);
    }
  });

  const abandoned = new Set(
    [...sets.add_to_cart].filter((sessionId) => !sets.purchase.has(sessionId))
  ).size;

  return {
    productViews: sets.product_view.size,
    addToCart: sets.add_to_cart.size,
    checkoutStart: sets.checkout_start.size,
    purchases: sets.purchase.size,
    abandoned,
  };
};

const calcDeltaPercent = (current: number, previous: number) => {
  if (previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
};

export function ConversionRateCard() {
  const today = useMemo(() => new Date(), []);
  const defaultTo = useMemo(() => format(today, "yyyy-MM-dd"), [today]);
  const defaultFrom = useMemo(() => format(subDays(today, 6), "yyyy-MM-dd"), [today]);

  const [preset, setPreset] = useState<RangePreset>("7d");
  const [customRange, setCustomRange] = useState({
    from: defaultFrom,
    to: defaultTo,
  });

  const range = useMemo(() => {
    if (preset === "custom") {
      const rawFrom = customRange.from || defaultFrom;
      const rawTo = customRange.to || defaultTo;
      if (rawFrom && rawTo && rawFrom > rawTo) {
        return { from: rawTo, to: rawFrom };
      }
      return { from: rawFrom, to: rawTo };
    }

    const days = preset === "7d" ? 6 : preset === "30d" ? 29 : 89;
    return {
      from: format(subDays(today, days), "yyyy-MM-dd"),
      to: defaultTo,
    };
  }, [preset, customRange, defaultFrom, defaultTo, today]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["conversion-funnel", range],
    queryFn: async () => {
      const fromDate = parseISO(range.from);
      const toDate = parseISO(range.to);
      const toExclusive = addDays(toDate, 1);

      const periodDays = differenceInCalendarDays(toDate, fromDate) + 1;
      const previousTo = subDays(fromDate, 1);
      const previousFrom = subDays(fromDate, periodDays);
      const previousToExclusive = addDays(previousTo, 1);

      const fetchEvents = async (from: Date, to: Date) => {
        const { data: rows, error: eventsError } = await supabase
          .from("analytics_events")
          .select("session_id, event_type")
          .gte("occurred_at", from.toISOString())
          .lt("occurred_at", to.toISOString())
          .in("event_type", EVENT_TYPES as unknown as string[]);

        if (eventsError) throw eventsError;
        return (rows || []) as EventRow[];
      };

      const [currentRows, previousRows] = await Promise.all([
        fetchEvents(fromDate, toExclusive),
        fetchEvents(previousFrom, previousToExclusive),
      ]);

      const current = buildCounts(currentRows);
      const previous = buildCounts(previousRows);

      return { current, previous };
    },
    staleTime: 60 * 1000,
  });

  const current = data?.current || {
    productViews: 0,
    addToCart: 0,
    checkoutStart: 0,
    purchases: 0,
    abandoned: 0,
  };
  const previous = data?.previous || current;

  const conversionRate = calculateConversionRate(current.purchases, current.productViews);
  const rangeLabel = formatRangeLabel(range.from, range.to);

  const metrics = [
    { key: "productViews", label: "Product Views", value: current.productViews, color: "bg-orange-100" },
    { key: "addToCart", label: "Add to Cart", value: current.addToCart, color: "bg-orange-200" },
    { key: "checkoutStart", label: "Proceed to Checkout", value: current.checkoutStart, color: "bg-orange-300" },
    { key: "purchases", label: "Completed Purchases", value: current.purchases, color: "bg-orange-400" },
    { key: "abandoned", label: "Abandoned Carts", value: current.abandoned, color: "bg-orange-500" },
  ] as const;

  const maxValue = Math.max(...metrics.map((m) => m.value), 1);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold">Conversion Rate</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition"
                  aria-label="Conversion rate info"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">Conversion Rate = (Completed Purchases / Product Views) * 100.</p>
                <p className="text-xs text-muted-foreground mt-1">Period: {rangeLabel}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-2xl font-semibold">
            {isLoading ? "..." : `${conversionRate.toFixed(2)}%`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Select value={preset} onValueChange={(value) => setPreset(value as RangePreset)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">This Week</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {preset === "custom" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="date"
                value={customRange.from}
                onChange={(event) =>
                  setCustomRange((prev) => ({ ...prev, from: event.target.value }))
                }
              />
              <Input
                type="date"
                value={customRange.to}
                onChange={(event) =>
                  setCustomRange((prev) => ({ ...prev, to: event.target.value }))
                }
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        {error && (
          <p className="text-xs text-destructive">Unable to load conversion rate.</p>
        )}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 md:divide-x md:divide-border">
          {metrics.map((metric, index) => {
            const prevValue = (previous as any)[metric.key] as number;
            const delta = calcDeltaPercent(metric.value, prevValue);
            const deltaLabel = `${delta >= 0 ? "+" : ""}${Math.round(delta)}%`;
            const barHeight = Math.max(6, Math.round((metric.value / maxValue) * 100));

            return (
              <div
                key={metric.key}
                className={cn(
                  "flex flex-col justify-between gap-6 px-4 py-3",
                  index === 0 ? "pl-0" : "md:pl-4"
                )}
              >
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-semibold">
                    {isLoading ? "..." : metric.value.toLocaleString()}
                  </p>
                  <span
                    className={cn(
                      "inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold",
                      delta >= 0
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-600"
                    )}
                  >
                    {deltaLabel}
                  </span>
                </div>

                <div className="h-16 flex items-end">
                  <div className="relative h-full w-full overflow-hidden rounded-t-lg bg-muted">
                    <div
                      className={cn("absolute bottom-0 left-0 right-0 rounded-t-lg", metric.color)}
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
