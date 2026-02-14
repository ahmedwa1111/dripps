import type { VercelRequest } from "@vercel/node";
import { getSupabaseAdminClient } from "./supabase.js";

export const getAccessToken = (req: VercelRequest) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || Array.isArray(header)) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

export const getUserFromRequest = async (req: VercelRequest) => {
  const token = getAccessToken(req);
  if (!token) return { token: null, user: null };
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { token, user: null };
  return { token, user: data.user };
};

export const assertAdmin = async (req: VercelRequest) => {
  const token = getAccessToken(req);
  if (!token) {
    const err = new Error("Missing authorization token");
    (err as any).status = 401;
    throw err;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    const err = new Error("Invalid or expired token");
    (err as any).status = 401;
    throw err;
  }

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  if (rolesError) {
    const err = new Error("Failed to validate admin role");
    (err as any).status = 500;
    throw err;
  }

  const isAdmin = roles?.some((row) => row.role === "admin");
  if (!isAdmin) {
    const err = new Error("Not authorized");
    (err as any).status = 403;
    throw err;
  }

  return { supabase, user: data.user, token };
};
