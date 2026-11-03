import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patientTasks } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { validDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const task = db.select().from(patientTasks).where(eq(patientTasks.id, params.id)).get();
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const changes: Record<string, unknown> = {};
  if ("done" in body) changes.done = Boolean(body.done);
  if ("title" in body) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 200) return NextResponse.json({ error: "bad title" }, { status: 400 });
    changes.title = title;
  }
  if ("dueDate" in body) {
    if (body.dueDate && !validDate(body.dueDate)) return NextResponse.json({ error: "dueDate must be YYYY-MM-DD" }, { status: 400 });
    changes.dueDate = body.dueDate || null;
  }
  if (!Object.keys(changes).length) return NextResponse.json({ error: "nothing to change" }, { status: 400 });

  db.update(patientTasks).set(changes).where(eq(patientTasks.id, params.id)).run();
  audit(user, "update", "task", task.id, "done" in changes ? `${changes.done ? "completed" : "reopened"} task "${task.title}"` : `edited task "${task.title}"`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const task = db.select().from(patientTasks).where(eq(patientTasks.id, params.id)).get();
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  db.delete(patientTasks).where(eq(patientTasks.id, params.id)).run();
  audit(user, "delete", "task", task.id, `deleted task "${task.title}"`);
  return NextResponse.json({ ok: true });
}
