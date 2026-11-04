import { NextResponse } from "next/server";
import { eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { invoices, patients, quotes } from "@/db/schema";
import { requireUser } from "@/lib/api";

export const dynamic = "force-dynamic";

// Records only: a hit is a name, a label and a link, nothing more.
export async function GET(req: Request) {
  const { denied } = requireUser();
  if (denied) return denied;

  // % and _ are wildcards in LIKE, a typed one would match everything.
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/[%_]/g, "").trim();
  if (q.length < 2) return NextResponse.json({ patients: [], invoices: [], quotes: [] });
  const term = `%${q}%`;
  const fullName = sql`(coalesce(${patients.firstName}, '') || ' ' || coalesce(${patients.lastName}, '')) like ${term}`;

  const people = db
    .select({ id: patients.id, firstName: patients.firstName, lastName: patients.lastName, phone: patients.phone, status: patients.status })
    .from(patients)
    .where(or(fullName, like(patients.phone, term), like(patients.email, term)))
    .limit(8)
    .all();

  const bills = db
    .select({ id: invoices.id, number: invoices.number, status: invoices.status, firstName: patients.firstName, lastName: patients.lastName })
    .from(invoices)
    .leftJoin(patients, eq(patients.id, invoices.patientId))
    .where(or(like(invoices.number, term), fullName))
    .limit(5)
    .all();

  const offers = db
    .select({ id: quotes.id, number: quotes.number, status: quotes.status, firstName: patients.firstName, lastName: patients.lastName })
    .from(quotes)
    .leftJoin(patients, eq(patients.id, quotes.patientId))
    .where(or(like(quotes.number, term), fullName))
    .limit(5)
    .all();

  return NextResponse.json({ patients: people, invoices: bills, quotes: offers });
}
