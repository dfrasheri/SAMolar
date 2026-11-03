import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const newId = (prefix: string) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;

export function requireUser() {
  const user = getSessionUser();
  if (!user) return { user: null, denied: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  return { user, denied: null };
}

export function pick(body: Record<string, unknown>, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in body) out[k] = body[k];
  return out;
}
