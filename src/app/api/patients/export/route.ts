import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patients } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { csvResponse, toCsv } from "@/lib/csv";
import { localDay } from "@/lib/attendance";

export const dynamic = "force-dynamic";

// A patient list is personal data, so taking one out is written to the audit log.
export async function GET(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const status = new URL(req.url).searchParams.get("status") || "active";
  if (!["active", "archived"].includes(status)) return NextResponse.json({ error: "status must be active or archived" }, { status: 400 });

  const rows = db.select().from(patients).where(eq(patients.status, status)).orderBy(asc(patients.lastName), asc(patients.firstName)).all();
  const body = toCsv(
    ["First name", "Last name", "Phone", "Email", "Country", "City", "Language", "Notes", "Created"],
    rows.map((p) => [p.firstName, p.lastName, p.phone, p.email, p.country, p.city, p.language, p.notes, p.createdAt ? localDay(p.createdAt) : ""]),
  );
  audit(user, "create", "export", null, `exported ${rows.length} ${status} patients as CSV`);
  return csvResponse(`patients-${status}-${localDay(Math.floor(Date.now() / 1000))}.csv`, body);
}
