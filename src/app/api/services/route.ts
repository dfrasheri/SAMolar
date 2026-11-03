import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { services } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const { denied } = requireUser();
  if (denied) return denied;
  return NextResponse.json(db.select().from(services).orderBy(asc(services.name)).all());
}

export async function POST(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = Number(body.price ?? 0);
  const durationMin = Number(body.durationMin ?? 30);
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "bad price" }, { status: 400 });
  if (!Number.isInteger(durationMin) || durationMin <= 0) return NextResponse.json({ error: "bad duration" }, { status: 400 });

  const id = newId("svc");
  db.insert(services).values({ id, name, price, durationMin }).run();
  audit(user, "create", "service", id, `added service ${name}`);
  return NextResponse.json({ id }, { status: 201 });
}
