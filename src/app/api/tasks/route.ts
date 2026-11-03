import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { patientTasks, patients } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { validDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { denied } = requireUser();
  if (denied) return denied;

  const status = new URL(req.url).searchParams.get("status") || "open";
  const rows = db
    .select({
      id: patientTasks.id,
      patientId: patientTasks.patientId,
      title: patientTasks.title,
      dueDate: patientTasks.dueDate,
      done: patientTasks.done,
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(patientTasks)
    .leftJoin(patients, eq(patients.id, patientTasks.patientId))
    .where(eq(patientTasks.done, status === "done"))
    .orderBy(sql`${patientTasks.dueDate} is null`, asc(patientTasks.dueDate), asc(patientTasks.createdAt))
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const patient = body.patientId ? db.select().from(patients).where(eq(patients.id, body.patientId)).get() : undefined;
  if (!patient) return NextResponse.json({ error: "no such patient" }, { status: 400 });

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (title.length > 200) return NextResponse.json({ error: "title is too long" }, { status: 400 });

  const dueDate = body.dueDate ? body.dueDate : null;
  if (dueDate && !validDate(dueDate)) return NextResponse.json({ error: "dueDate must be YYYY-MM-DD" }, { status: 400 });

  const id = newId("tsk");
  db.insert(patientTasks).values({ id, patientId: patient.id, title, dueDate }).run();
  audit(user, "create", "task", id, `added task "${title}" for ${[patient.firstName, patient.lastName].filter(Boolean).join(" ")}`);
  return NextResponse.json({ id }, { status: 201 });
}
