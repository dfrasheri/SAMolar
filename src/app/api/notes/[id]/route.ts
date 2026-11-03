import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patientNotes } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const note = db.select().from(patientNotes).where(eq(patientNotes.id, params.id)).get();
  if (!note) return NextResponse.json({ error: "not found" }, { status: 404 });
  db.delete(patientNotes).where(eq(patientNotes.id, params.id)).run();
  audit(user, "delete", "patient", note.patientId, "deleted a note");
  return NextResponse.json({ ok: true });
}
