import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patients, recalls } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { validDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { denied } = requireUser();
  if (denied) return denied;

  const status = new URL(req.url).searchParams.get("status");
  const rows = db
    .select({
      id: recalls.id,
      patientId: recalls.patientId,
      dueDate: recalls.dueDate,
      reason: recalls.reason,
      status: recalls.status,
      contactedAt: recalls.contactedAt,
      firstName: patients.firstName,
      lastName: patients.lastName,
      phone: patients.phone,
      email: patients.email,
      language: patients.language,
    })
    .from(recalls)
    .leftJoin(patients, eq(patients.id, recalls.patientId))
    .where(status ? eq(recalls.status, status) : undefined)
    .orderBy(asc(recalls.dueDate))
    .all();

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const patient = body.patientId ? db.select().from(patients).where(eq(patients.id, body.patientId)).get() : undefined;
  if (!patient) return NextResponse.json({ error: "no such patient" }, { status: 400 });
  if (!validDate(body.dueDate)) return NextResponse.json({ error: "dueDate must be YYYY-MM-DD" }, { status: 400 });

  const id = newId("rcl");
  db.insert(recalls).values({ id, patientId: body.patientId, dueDate: body.dueDate, reason: body.reason || null }).run();
  audit(user, "create", "recall", id, `added recall for ${[patient.firstName, patient.lastName].filter(Boolean).join(" ")} due ${body.dueDate}`);
  return NextResponse.json({ id }, { status: 201 });
}
