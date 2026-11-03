import { NextResponse } from "next/server";
import { and, asc, eq, gt, gte, lt, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, calendars, patients } from "@/db/schema";
import { newId, pick, requireUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { denied } = requireUser();
  if (denied) return denied;

  const url = new URL(req.url);
  const from = Number(url.searchParams.get("from")) || 0;
  const to = Number(url.searchParams.get("to")) || 4102444800;

  const rows = db
    .select({
      id: appointments.id,
      calendarId: appointments.calendarId,
      patientId: appointments.patientId,
      title: appointments.title,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      notes: appointments.notes,
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(appointments)
    .leftJoin(patients, eq(patients.id, appointments.patientId))
    .where(and(gte(appointments.startsAt, from), lt(appointments.startsAt, to)))
    .orderBy(asc(appointments.startsAt))
    .all();

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { denied } = requireUser();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const { calendarId, patientId, startsAt, endsAt } = body;
  if (!calendarId || !patientId || !Number.isInteger(startsAt) || !Number.isInteger(endsAt)) {
    return NextResponse.json({ error: "calendarId, patientId, startsAt, endsAt required" }, { status: 400 });
  }
  if (endsAt <= startsAt) return NextResponse.json({ error: "end must be after start" }, { status: 400 });
  if (!db.select().from(calendars).where(eq(calendars.id, calendarId)).get()) {
    return NextResponse.json({ error: "no such calendar" }, { status: 400 });
  }
  if (!db.select().from(patients).where(eq(patients.id, patientId)).get()) {
    return NextResponse.json({ error: "no such patient" }, { status: 400 });
  }

  const clash = db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.calendarId, calendarId),
        ne(appointments.status, "cancelled"),
        lt(appointments.startsAt, endsAt),
        gt(appointments.endsAt, startsAt),
      ),
    )
    .get();
  if (clash) return NextResponse.json({ error: "that slot is already booked" }, { status: 409 });

  const id = newId("apt");
  db.insert(appointments).values({ id, calendarId, patientId, startsAt, endsAt, ...pick(body, ["title", "notes"]) }).run();
  return NextResponse.json({ id }, { status: 201 });
}
