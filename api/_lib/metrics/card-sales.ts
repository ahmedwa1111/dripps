export type CardSalesRow = {
  total_amount_cents: number | null;
  paid_at: string | null;
};

export type CardSalesTimeseriesPoint = {
  date: string;
  salesCents: number;
  orders: number;
};

export type CardSalesSummary = {
  totalCardSalesCents: number;
  totalCardOrders: number;
  timeseries: CardSalesTimeseriesPoint[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

export const buildTimeseries = (
  from: Date,
  to: Date,
  rows: CardSalesRow[]
): CardSalesTimeseriesPoint[] => {
  const totalsByDate = new Map<string, { salesCents: number; orders: number }>();

  rows.forEach((row) => {
    if (!row.paid_at) return;
    const key = row.paid_at.slice(0, 10);
    const current = totalsByDate.get(key) || { salesCents: 0, orders: 0 };
    current.salesCents += Number(row.total_amount_cents || 0);
    current.orders += 1;
    totalsByDate.set(key, current);
  });

  const series: CardSalesTimeseriesPoint[] = [];
  for (let cursor = new Date(from.getTime()); cursor <= to; cursor = new Date(cursor.getTime() + MS_PER_DAY)) {
    const key = toDateKey(cursor);
    const current = totalsByDate.get(key) || { salesCents: 0, orders: 0 };
    series.push({ date: key, salesCents: current.salesCents, orders: current.orders });
  }

  return series;
};

export const summarizeCardSales = (
  from: Date,
  to: Date,
  rows: CardSalesRow[]
): CardSalesSummary => {
  const totalCardSalesCents = rows.reduce(
    (sum, row) => sum + Number(row.total_amount_cents || 0),
    0
  );
  const totalCardOrders = rows.length;
  const timeseries = buildTimeseries(from, to, rows);

  return {
    totalCardSalesCents,
    totalCardOrders,
    timeseries,
  };
};
