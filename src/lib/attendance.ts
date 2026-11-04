import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { attendance } from "@/db/schema";
import { readSetting } from "@/lib/settings";
import { bandFor, minutesLate, parseRules, type Band, type Rules } from "@/lib/punctuality";

export const RULES_KEY = "punctualityRules";

export function currentRules(): Rules {
  return parseRules(readSetting<unknown>(RULES_KEY, null));
}

export function localDay(ts: number) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function minuteOfDay(ts: number) {
  const d = new Date(ts * 1000);
  return d.getHours() * 60 + d.getMinutes();
}

// A forgotten clock out is closed at the end of its own day, so hours never
// bleed into the next day. The row says it was closed automatically.
export function autoCloseForgotten(today: string) {
  const open = db.select().from(attendance).where(and(isNull(attendance.clockOut), lt(attendance.day, today))).all();
  for (const r of open) {
    const end = Math.floor(new Date(`${r.day}T23:59:59`).getTime() / 1000);
    db.update(attendance).set({ clockOut: end, closedBy: "auto" }).where(eq(attendance.id, r.id)).run();
  }
  return open.length;
}

type Row = { id: string; staffId: string; day: string; clockIn: number; clockOut: number | null; closedBy: string | null };

// Marks the first clock in of each person and day with its band.
export function withBands<T extends Row>(rows: T[], rules: Rules) {
  const firstOf = new Map<string, string>();
  for (const r of [...rows].sort((a, b) => a.clockIn - b.clockIn)) {
    const key = `${r.staffId}|${r.day}`;
    if (!firstOf.has(key)) firstOf.set(key, r.id);
  }
  return rows.map((r) => {
    const first = firstOf.get(`${r.staffId}|${r.day}`) === r.id;
    const minute = minuteOfDay(r.clockIn);
    const band: Band | null = first ? bandFor(minute, rules) : null;
    const hours = r.clockOut ? Math.round(((r.clockOut - r.clockIn) / 3600) * 100) / 100 : null;
    return { ...r, first, band, lateBy: band === "late" ? minutesLate(minute, rules) : 0, hours };
  });
}

export const openShift = (staffId: string) =>
  db.select().from(attendance).where(and(eq(attendance.staffId, staffId), isNull(attendance.clockOut))).get();
