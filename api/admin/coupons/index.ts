import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertAdmin } from "../../_lib/auth.js";
import { normalizeCouponPayload } from "../../_lib/coupon-admin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { supabase } = await assertAdmin(req);

    if (req.method === "GET") {
      const searchParam =
        typeof req.query.search === "string" ? req.query.search.trim() : "";
      const requestedSort = typeof req.query.sort === "string" ? req.query.sort : "created_at";
      const allowedSorts = ["created_at", "used_count", "code", "expires_at"];
      const sortParam = allowedSorts.includes(requestedSort) ? requestedSort : "created_at";
      const directionParam =
        typeof req.query.direction === "string" ? req.query.direction : "desc";

      let query = supabase.from("coupons").select("*").is("deleted_at", null);

      if (searchParam) {
        query = query.ilike("code", `%${searchParam.toUpperCase()}%`);
      }

      const ascending = directionParam.toLowerCase() === "asc";
      query = query.order(sortParam, { ascending });

      const { data, error } = await query;
      if (error) {
        res.status(500).json({ error: "Failed to load coupons" });
        return;
      }

      res.status(200).json({ coupons: data || [] });
      return;
    }

    const { payload, error: payloadError } = normalizeCouponPayload(req.body || {});
    if (payloadError || !payload) {
      res.status(400).json({ error: payloadError || "Invalid coupon payload" });
      return;
    }

    const { data, error } = await supabase
      .from("coupons")
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        res.status(400).json({ error: "Coupon code already exists" });
        return;
      }
      res.status(500).json({ error: error.message || "Failed to create coupon" });
      return;
    }

    res.status(200).json(data);
  } catch (error: any) {
    const status = error?.status || 500;
    res.status(status).json({ error: error?.message || "Failed to process coupon" });
  }
}
