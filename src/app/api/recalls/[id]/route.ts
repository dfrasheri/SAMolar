import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { recalls } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { validDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "contacted", "done", "dismissed"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  if (!db.select().from(recalls).where(eq(recalls.id, params.id)).get()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const changes: Record<string, unknown> = {};
  if ("status" in body) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
    changes.status = body.status;
  }
  if ("dueDate" in body) {
    if (!validDate(body.dueDate)) return NextResponse.json({ error: "dueDate must be YYYY-MM-DD" }, { status: 400 });
    changes.dueDate = body.dueDate;
  }
  if ("reason" in body) changes.reason = body.reason || null;
  if (!Object.keys(changes).length) return NextResponse.json({ error: "nothing to change" }, { status: 400 });

  db.update(recalls).set(changes).where(eq(recalls.id, params.id)).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  db.delete(recalls).where(eq(recalls.id, params.id)).run();
  return NextResponse.json({ ok: true });
}
