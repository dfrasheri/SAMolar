import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patients, quoteLines, quotes } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { linesOf, quoteTotals, readLines, readValidUntil } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { denied } = requireUser();
  if (denied) return denied;
  const patientId = new URL(req.url).searchParams.get("patientId");
  const rows = db
    .select({
      id: quotes.id,
      number: quotes.number,
      patientId: quotes.patientId,
      status: quotes.status,
      validUntil: quotes.validUntil,
      invoiceId: quotes.invoiceId,
      createdAt: quotes.createdAt,
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(quotes)
    .leftJoin(patients, eq(patients.id, quotes.patientId))
    .where(patientId ? eq(quotes.patientId, patientId) : undefined)
    .orderBy(desc(quotes.number))
    .all();
  return NextResponse.json(rows.map((r) => ({ ...r, ...quoteTotals(linesOf(r.id)) })));
}

export async function POST(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const patient = body.patientId ? db.select().from(patients).where(eq(patients.id, body.patientId)).get() : undefined;
  if (!patient) return NextResponse.json({ error: "no such patient" }, { status: 400 });

  const lines = readLines(body.lines ?? []);
  if (typeof lines === "string") return NextResponse.json({ error: lines }, { status: 400 });
  const validUntil = readValidUntil(body.validUntil);
  if (validUntil === false) return NextResponse.json({ error: "validUntil must be YYYY-MM-DD" }, { status: 400 });

  const id = newId("quo");
  db.transaction((tx) => {
    const last = tx.select({ number: quotes.number }).from(quotes).orderBy(desc(quotes.number)).get();
    const next = last ? Number(last.number.replace("Q-", "")) + 1 : 1;
    tx.insert(quotes)
      .values({ id, number: `Q-${String(next).padStart(4, "0")}`, patientId: patient.id, note: typeof body.note === "string" ? body.note.trim() || null : null, validUntil })
      .run();
    lines.forEach((l, i) => tx.insert(quoteLines).values({ id: newId("qul"), quoteId: id, position: i, ...l }).run());
  });
  const created = db.select({ number: quotes.number }).from(quotes).where(eq(quotes.id, id)).get();
  audit(user, "create", "quote", id, `created quote ${created?.number} for ${[patient.firstName, patient.lastName].filter(Boolean).join(" ")}`);
  return NextResponse.json({ id }, { status: 201 });
}
