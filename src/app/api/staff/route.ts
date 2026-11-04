import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { staff } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ROLES = ["doctor", "assistant", "reception"];

export async function GET() {
  const { denied } = requireUser();
  if (denied) return denied;
  return NextResponse.json(db.select().from(staff).orderBy(asc(staff.name)).all());
}

export async function POST(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) return NextResponse.json({ error: "name required" }, { status: 400 });
  const role = ROLES.includes(body.role) ? body.role : "assistant";
  const id = newId("stf");
  db.insert(staff).values({ id, name, role }).run();
  audit(user, "create", "staff", id, `added ${role} ${name}`);
  return NextResponse.json({ id }, { status: 201 });
}
