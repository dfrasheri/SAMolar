import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { services } from "@/db/schema";
import { requireUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  if (!db.select().from(services).where(eq(services.id, params.id)).get()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const changes: Record<string, unknown> = {};
  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    changes.name = name;
  }
  if ("price" in body) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "bad price" }, { status: 400 });
    changes.price = price;
  }
  if ("durationMin" in body) {
    const d = Number(body.durationMin);
    if (!Number.isInteger(d) || d <= 0) return NextResponse.json({ error: "bad duration" }, { status: 400 });
    changes.durationMin = d;
  }
  if ("active" in body) changes.active = Boolean(body.active);
  if (!Object.keys(changes).length) return NextResponse.json({ error: "nothing to change" }, { status: 400 });

  db.update(services).set(changes).where(eq(services.id, params.id)).run();
  return NextResponse.json({ ok: true });
}
