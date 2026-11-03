import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patientNotes, patients } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  const rows = db.select().from(patientNotes).where(eq(patientNotes.patientId, params.id)).orderBy(desc(patientNotes.createdAt), desc(patientNotes.id)).all();
  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;

  const patient = db.select().from(patients).where(eq(patients.id, params.id)).get();
  if (!patient) return NextResponse.json({ error: "no such patient" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "note is empty" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "note is too long" }, { status: 400 });

  const id = newId("note");
  db.insert(patientNotes).values({ id, patientId: patient.id, body: text, authorName: user.name }).run();
  audit(user, "create", "patient", patient.id, `added a note to ${[patient.firstName, patient.lastName].filter(Boolean).join(" ")}`);
  return NextResponse.json({ id }, { status: 201 });
}
