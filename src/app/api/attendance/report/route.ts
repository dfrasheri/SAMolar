import { NextResponse } from "next/server";
import { and, gte, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { attendance, staff } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { validDate } from "@/lib/dates";
import { onTimePct, type Band } from "@/lib/punctuality";
import { autoCloseForgotten, currentRules, localDay, withBands } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { denied } = requireUser();
  if (denied) return denied;
  const now = Math.floor(Date.now() / 1000);
  const today = localDay(now);
  autoCloseForgotten(today);

  const q = new URL(req.url).searchParams;
  const to = q.get("to") || today;
  const from = q.get("from") || localDay(now - 13 * 86400);
  if (!validDate(from) || !validDate(to) || from > to) {
    return NextResponse.json({ error: "from and to must be YYYY-MM-DD, from first" }, { status: 400 });
  }

  const rules = currentRules();
  const rows = withBands(db.select().from(attendance).where(and(gte(attendance.day, from), lte(attendance.day, to))).all(), rules);
  const people = db.select().from(staff).all();

  const perPerson = people.map((p) => {
    const mine = rows.filter((r) => r.staffId === p.id);
    const bands = mine.map((r) => r.band).filter((b): b is Band => b !== null);
    return {
      staffId: p.id,
      name: p.name,
      role: p.role,
      active: p.active,
      days: new Set(mine.map((r) => r.day)).size,
      early: bands.filter((b) => b === "early").length,
      ontime: bands.filter((b) => b === "ontime").length,
      late: bands.filter((b) => b === "late").length,
      minutesLate: mine.reduce((s, r) => s + r.lateBy, 0),
      hours: Math.round(mine.reduce((s, r) => s + (r.hours ?? 0), 0) * 100) / 100,
      autoClosed: mine.filter((r) => r.closedBy === "auto").length,
      onTimePct: onTimePct(bands),
    };
  });

  const allBands = rows.map((r) => r.band).filter((b): b is Band => b !== null);
  return NextResponse.json({ from, to, rules, onTimePct: onTimePct(allBands), perPerson });
}
