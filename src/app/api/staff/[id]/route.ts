import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { staff } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Staff are never deleted, only made inactive, so their attendance keeps its name.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const person = db.select().from(staff).where(eq(staff.id, params.id)).get();
  if (!person) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const changes: Record<string, unknown> = {};
  if ("active" in body) changes.active = Boolean(body.active);
  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 80) return NextResponse.json({ error: "bad name" }, { status: 400 });
    changes.name = name;
  }
  if ("role" in body) {
    if (!["doctor", "assistant", "reception"].includes(body.role)) return NextResponse.json({ error: "bad role" }, { status: 400 });
    changes.role = body.role;
  }
  if (!Object.keys(changes).length) return NextResponse.json({ error: "nothing to change" }, { status: 400 });
  db.update(staff).set(changes).where(eq(staff.id, person.id)).run();
  const summary = "active" in changes ? `${changes.active ? "reactivated" : "deactivated"} ${person.name}` : `edited ${person.name}`;
  audit(user, "update", "staff", person.id, summary);
  return NextResponse.json({ ok: true });
}
