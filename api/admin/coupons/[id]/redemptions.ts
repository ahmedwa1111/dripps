import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertAdmin } from "../../../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { supabase } = await assertAdmin(req);
    const id = typeof req.query.id === "string" ? req.query.id : Array.isArray(req.query.id) ? req.query.id[0] : null;

    if (!id) {
      res.status(400).json({ error: "Missing coupon id" });
      return;
    }

    const { data, error } = await supabase
      .from("coupon_redemptions")
      .select("id, coupon_id, order_id, user_id, discount_amount, created_at")
      .eq("coupon_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: "Failed to load coupon redemptions" });
      return;
    }

    res.status(200).json({ redemptions: data || [] });
  } catch (error: any) {
    const status = error?.status || 500;
    res.status(status).json({ error: error?.message || "Failed to load coupon redemptions" });
  }
}
