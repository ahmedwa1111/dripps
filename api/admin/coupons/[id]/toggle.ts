import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertAdmin } from "../../../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
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

    const { data: coupon, error: couponError } = await supabase
      .from("coupons")
      .select("id, is_active")
      .eq("id", id)
      .maybeSingle();

    if (couponError || !coupon) {
      res.status(404).json({ error: "Coupon not found" });
      return;
    }

    const { data, error } = await supabase
      .from("coupons")
      .update({ is_active: !coupon.is_active })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to toggle coupon" });
      return;
    }

    res.status(200).json(data);
  } catch (error: any) {
    const status = error?.status || 500;
    res.status(status).json({ error: error?.message || "Failed to toggle coupon" });
  }
}
