import { NextResponse } from "next/server";
import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/db/client";
import { patients } from "@/db/schema";
import { newId, pick, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { findExisting } from "@/lib/identity";

export const dynamic = "force-dynamic";

const FIELDS = ["firstName", "lastName", "phone", "email", "country", "city", "language", "notes"];

export async function GET(req: Request) {
  const { denied } = requireUser();
  if (denied) return denied;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status") || "active";

  const filters = [eq(patients.status, status)];
  if (q) {
    const term = `%${q}%`;
    filters.push(
      or(like(patients.firstName, term), like(patients.lastName, term), like(patients.phone, term), like(patients.email, term))!,
    );
  }

  const rows = db.select().from(patients).where(and(...filters)).orderBy(desc(patients.createdAt)).limit(200).all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  if (!body.firstName && !body.lastName) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  // Tell the desk who this already is instead of making a twin. An email match
  // can be overridden (two people may share a family address), a phone cannot.
  const match = findExisting(body);
  if (match && (match.by === "phone" || !body.force)) {
    return NextResponse.json({ error: `already a patient: ${match.name}`, code: "patient-exists", match, canForce: match.by !== "phone" }, { status: 409 });
  }

  const id = newId("pat");
  db.insert(patients).values({ id, ...pick(body, FIELDS) }).run();
  audit(user, "create", "patient", id, `created patient ${[body.firstName, body.lastName].filter(Boolean).join(" ")}`);
  return NextResponse.json({ id }, { status: 201 });
}
