import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { patients } from "@/db/schema";

// One rule for "is this person already here?". Phone first, then email.
// A phone is the stronger key, so a phone match cannot be overridden.

export function normPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  const bare = digits.replace(/\D/g, "");
  return bare.length >= 6 ? bare : null;
}

export function normEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
}

export type Match = { id: string; name: string; phone: string | null; email: string | null; by: "phone" | "email" };

export function findExisting(input: { phone?: unknown; email?: unknown }, excludeId?: string): Match | null {
  const phone = normPhone(input.phone);
  const email = normEmail(input.email);
  if (!phone && !email) return null;
  const rows = db
    .select()
    .from(patients)
    .where(excludeId ? and(eq(patients.status, "active"), ne(patients.id, excludeId)) : eq(patients.status, "active"))
    .all();
  const describe = (p: (typeof rows)[number], by: Match["by"]): Match => ({
    id: p.id,
    name: [p.firstName, p.lastName].filter(Boolean).join(" "),
    phone: p.phone,
    email: p.email,
    by,
  });
  if (phone) {
    const hit = rows.find((p) => normPhone(p.phone) === phone);
    if (hit) return describe(hit, "phone");
  }
  if (email) {
    const hit = rows.find((p) => normEmail(p.email) === email);
    if (hit) return describe(hit, "email");
  }
  return null;
}
