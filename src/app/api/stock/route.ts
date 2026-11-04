import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { stockItems } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { isLow } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET() {
  const { denied } = requireUser();
  if (denied) return denied;
  const rows = db.select().from(stockItems).orderBy(asc(stockItems.name)).all();
  return NextResponse.json(rows.map((r) => ({ ...r, low: isLow(r.qty, r.lowAt) })));
}

export async function POST(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) return NextResponse.json({ error: "name required" }, { status: 400 });
  const unit = typeof body.unit === "string" && body.unit.trim() ? body.unit.trim().slice(0, 30) : "piece";
  const lowAt = body.lowAt === "" || body.lowAt == null ? null : Number(body.lowAt);
  if (lowAt !== null && (!Number.isFinite(lowAt) || lowAt < 0)) return NextResponse.json({ error: "lowAt must be a number" }, { status: 400 });

  const id = newId("stk");
  db.insert(stockItems).values({ id, name, unit, qty: 0, lowAt }).run();
  audit(user, "create", "stock", id, `added stock item "${name}"`);
  return NextResponse.json({ id }, { status: 201 });
}
