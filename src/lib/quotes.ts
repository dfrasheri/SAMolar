import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { quoteLines } from "@/db/schema";
import { round2 } from "@/lib/invoices";
import { validDate } from "@/lib/dates";

// core = in the total, optional = priced but left out of the total,
// free = shown at no charge. An unknown band reads as core, so a mistake
// can never make a quote look cheaper than it is.
export const BANDS = ["core", "optional", "free"] as const;
export type Band = (typeof BANDS)[number];
export const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined"] as const;

export const bandOf = (b: unknown): Band => (BANDS.includes(b as Band) ? (b as Band) : "core");

export type LineInput = { serviceId: string | null; description: string; tooth: number | null; quantity: number; unitPrice: number; band: Band };

export function quoteTotals(lines: { quantity: number; unitPrice: number; band: string }[]) {
  const sum = (band: Band) => round2(lines.filter((l) => bandOf(l.band) === band).reduce((s, l) => s + l.quantity * l.unitPrice, 0));
  return { total: sum("core"), optional: sum("optional") };
}

export function linesOf(quoteId: string) {
  return db.select().from(quoteLines).where(eq(quoteLines.quoteId, quoteId)).orderBy(asc(quoteLines.position)).all();
}

// FDI numbering: quadrants 1 to 4, teeth 1 to 8.
export const validTooth = (n: number) => Number.isInteger(n) && n >= 11 && n <= 48 && n % 10 >= 1 && n % 10 <= 8;

// Strict: one bad line refuses the whole save with the line number in the message.
export function readLines(raw: unknown): LineInput[] | string {
  if (!Array.isArray(raw)) return "lines must be a list";
  if (raw.length > 60) return "too many lines";
  const out: LineInput[] = [];
  for (const [i, l] of raw.entries()) {
    const at = `line ${i + 1}`;
    const description = typeof l?.description === "string" ? l.description.trim() : "";
    if (!description || description.length > 200) return `${at}: description required`;
    const quantity = Number(l.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return `${at}: quantity must be 1 to 99`;
    const unitPrice = Number(l.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return `${at}: price must be zero or more`;
    const band = bandOf(l.band);
    if (l.band !== undefined && !BANDS.includes(l.band)) return `${at}: band must be core, optional or free`;
    const tooth = l.tooth === "" || l.tooth == null ? null : Number(l.tooth);
    if (tooth !== null && !validTooth(tooth)) return `${at}: tooth must be an FDI number like 36`;
    out.push({ serviceId: typeof l.serviceId === "string" && l.serviceId ? l.serviceId : null, description, tooth, quantity, unitPrice: band === "free" ? 0 : unitPrice, band });
  }
  return out;
}

export function readValidUntil(v: unknown): string | null | false {
  if (v === "" || v == null) return null;
  return validDate(v) ? v : false;
}
