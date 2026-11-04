import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { attendance, staff } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { validDate } from "@/lib/dates";
import { autoCloseForgotten, currentRules, localDay, openShift, withBands } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { denied } = requireUser();
  if (denied) return denied;
  const today = localDay(Math.floor(Date.now() / 1000));
  autoCloseForgotten(today);

  const day = new URL(req.url).searchParams.get("day") || today;
  if (!validDate(day)) return NextResponse.json({ error: "day must be YYYY-MM-DD" }, { status: 400 });

  const rules = currentRules();
  const rows = db
    .select({
      id: attendance.id,
      staffId: attendance.staffId,
      day: attendance.day,
      clockIn: attendance.clockIn,
      clockOut: attendance.clockOut,
      closedBy: attendance.closedBy,
      note: attendance.note,
      name: staff.name,
      role: staff.role,
    })
    .from(attendance)
    .leftJoin(staff, eq(staff.id, attendance.staffId))
    .where(eq(attendance.day, day))
    .orderBy(asc(attendance.clockIn))
    .all();
  return NextResponse.json({ day, rules, rows: withBands(rows, rules) });
}

// { staffId, action: "in" | "out" }. A second clock in over an open one is refused.
export async function POST(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const person = body.staffId ? db.select().from(staff).where(eq(staff.id, body.staffId)).get() : undefined;
  if (!person || !person.active) return NextResponse.json({ error: "no such active staff member" }, { status: 400 });

  const now = Math.floor(Date.now() / 1000);
  autoCloseForgotten(localDay(now));
  const open = openShift(person.id);

  if (body.action === "in") {
    if (open) return NextResponse.json({ error: `${person.name} is already clocked in` }, { status: 409 });
    const id = newId("att");
    db.insert(attendance).values({ id, staffId: person.id, day: localDay(now), clockIn: now }).run();
    audit(user, "create", "attendance", id, `clocked in ${person.name}`);
    return NextResponse.json({ id }, { status: 201 });
  }
  if (body.action === "out") {
    if (!open) return NextResponse.json({ error: `${person.name} is not clocked in` }, { status: 409 });
    db.update(attendance).set({ clockOut: now, closedBy: "desk" }).where(eq(attendance.id, open.id)).run();
    audit(user, "update", "attendance", open.id, `clocked out ${person.name}`);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "action must be in or out" }, { status: 400 });
}
