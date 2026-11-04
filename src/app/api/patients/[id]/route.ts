import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patients } from "@/db/schema";
import { pick, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { findExisting } from "@/lib/identity";

export const dynamic = "force-dynamic";

const FIELDS = ["firstName", "lastName", "phone", "email", "country", "city", "language", "notes", "status"];

function find(id: string) {
  return db.select().from(patients).where(eq(patients.id, id)).get();
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  const row = find(params.id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const current = find(params.id);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if ("phone" in body || "email" in body) {
    const match = findExisting({ phone: body.phone, email: body.email }, current.id);
    if (match) return NextResponse.json({ error: `that ${match.by} belongs to ${match.name}`, code: "identity-taken", match }, { status: 409 });
  }
  const changes = { ...pick(body, FIELDS), updatedAt: Math.floor(Date.now() / 1000) };
  db.update(patients).set(changes).where(eq(patients.id, params.id)).run();
  audit(user, "update", "patient", params.id, `updated patient ${[current.firstName, current.lastName].filter(Boolean).join(" ")}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const current = find(params.id);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });
  db.update(patients).set({ status: "archived" }).where(eq(patients.id, params.id)).run();
  audit(user, "delete", "patient", params.id, `archived patient ${[current.firstName, current.lastName].filter(Boolean).join(" ")}`);
  return NextResponse.json({ ok: true });
}
