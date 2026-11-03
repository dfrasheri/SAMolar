import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { treatments } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { isTooth } from "@/lib/teeth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const current = db.select().from(treatments).where(eq(treatments.id, params.id)).get();
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const changes: Record<string, unknown> = {};
  if ("status" in body) {
    if (!["planned", "done"].includes(body.status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
    changes.status = body.status;
    changes.doneAt = body.status === "done" ? current.doneAt ?? Math.floor(Date.now() / 1000) : null;
  }
  if ("price" in body) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "bad price" }, { status: 400 });
    changes.price = price;
  }
  if ("tooth" in body) {
    const tooth = body.tooth === null || body.tooth === "" ? null : Number(body.tooth);
    if (tooth !== null && !isTooth(tooth)) return NextResponse.json({ error: "bad tooth number" }, { status: 400 });
    changes.tooth = tooth;
  }
  if ("notes" in body) changes.notes = body.notes || null;
  if (!Object.keys(changes).length) return NextResponse.json({ error: "nothing to change" }, { status: 400 });

  db.update(treatments).set(changes).where(eq(treatments.id, params.id)).run();
  audit(user, "update", "treatment", current.id, "status" in changes ? `marked ${current.name} ${changes.status}` : `updated ${current.name}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const current = db.select().from(treatments).where(eq(treatments.id, params.id)).get();
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });
  db.delete(treatments).where(eq(treatments.id, params.id)).run();
  audit(user, "delete", "treatment", current.id, `removed ${current.name}`);
  return NextResponse.json({ ok: true });
}
