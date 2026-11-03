import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patients } from "@/db/schema";
import { pick, requireUser } from "@/lib/api";

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
  const { denied } = requireUser();
  if (denied) return denied;
  if (!find(params.id)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const changes = { ...pick(body, FIELDS), updatedAt: Math.floor(Date.now() / 1000) };
  db.update(patients).set(changes).where(eq(patients.id, params.id)).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  if (!find(params.id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  db.update(patients).set({ status: "archived" }).where(eq(patients.id, params.id)).run();
  return NextResponse.json({ ok: true });
}
