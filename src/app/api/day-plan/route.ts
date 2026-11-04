import { NextResponse } from "next/server";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, calendars, patients } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { validDate } from "@/lib/dates";
import { readSetting, writeSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

const noteKey = (day: string) => `dayNote:${day}`;

export async function GET(req: Request) {
  const { denied } = requireUser();
  if (denied) return denied;
  const day = new URL(req.url).searchParams.get("date") ?? "";
  if (!validDate(day)) return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });

  const from = Math.floor(new Date(`${day}T00:00:00`).getTime() / 1000);
  const rows = db
    .select({
      id: appointments.id,
      calendarId: appointments.calendarId,
      patientId: appointments.patientId,
      title: appointments.title,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(appointments)
    .leftJoin(patients, eq(patients.id, appointments.patientId))
    .where(and(gte(appointments.startsAt, from), lt(appointments.startsAt, from + 86400)))
    .orderBy(asc(appointments.startsAt))
    .all();

  return NextResponse.json({
    date: day,
    calendars: db.select().from(calendars).orderBy(asc(calendars.name)).all(),
    appointments: rows,
    note: readSetting<string>(noteKey(day), ""),
  });
}

// Saves the free text note for one day.
export async function POST(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  if (!validDate(body.date)) return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.slice(0, 2000) : "";
  writeSetting(noteKey(body.date), note);
  audit(user, "update", "setting", noteKey(body.date), `day note for ${body.date}`);
  return NextResponse.json({ ok: true });
}
