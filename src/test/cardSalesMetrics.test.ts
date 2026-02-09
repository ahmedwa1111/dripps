import { describe, it, expect, vi } from "vitest";
import http from "http";
import { summarizeCardSales } from "../../api/_lib/metrics/card-sales";

let mockSupabase: any;

vi.mock("../../api/_lib/supabase", () => ({
  getSupabaseAdminClient: () => mockSupabase,
}));

const buildSupabaseMock = (rows: Array<{ total_amount_cents: number | null; paid_at: string | null }>) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    }),
  },
  from: (table: string) => {
    if (table === "user_roles") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ role: "admin" }], error: null }),
      };
    }
    if (table === "orders") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: rows, error: null }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
  },
});

describe("card sales metrics", () => {
  it("summarizes totals and fills timeseries gaps", () => {
    const rows = [
      { total_amount_cents: 1000, paid_at: "2026-02-01T10:00:00.000Z" },
      { total_amount_cents: 2500, paid_at: "2026-02-01T12:00:00.000Z" },
      { total_amount_cents: 500, paid_at: "2026-02-03T02:00:00.000Z" },
    ];

    const summary = summarizeCardSales(
      new Date("2026-02-01T00:00:00.000Z"),
      new Date("2026-02-03T00:00:00.000Z"),
      rows
    );

    expect(summary.totalCardSalesCents).toBe(4000);
    expect(summary.totalCardOrders).toBe(3);
    expect(summary.timeseries).toEqual([
      { date: "2026-02-01", salesCents: 3500, orders: 2 },
      { date: "2026-02-02", salesCents: 0, orders: 0 },
      { date: "2026-02-03", salesCents: 500, orders: 1 },
    ]);
  });

  it("serves card sales metrics from the endpoint", async () => {
    const rows = [
      { total_amount_cents: 1500, paid_at: "2026-02-01T09:00:00.000Z" },
      { total_amount_cents: 500, paid_at: "2026-02-02T15:00:00.000Z" },
    ];
    mockSupabase = buildSupabaseMock(rows);

    const { cardSalesApp } = await import("../../api/admin/metrics/card-sales");
    const server = http.createServer(cardSalesApp);

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : null;

    if (!port) {
      server.close();
      throw new Error("Failed to start server for card sales test");
    }

    try {
      const resp = await fetch(
        `http://127.0.0.1:${port}/api/admin/metrics/card-sales?from=2026-02-01&to=2026-02-02`,
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        }
      );

      const payload = await resp.json();

      expect(resp.status).toBe(200);
      expect(payload.totalCardSalesCents).toBe(2000);
      expect(payload.totalCardOrders).toBe(2);
      expect(payload.timeseries).toEqual([
        { date: "2026-02-01", salesCents: 1500, orders: 1 },
        { date: "2026-02-02", salesCents: 500, orders: 1 },
      ]);
    } finally {
      server.close();
    }
  });
});
