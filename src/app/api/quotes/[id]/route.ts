import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patients, quoteLines, quotes } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { QUOTE_STATUSES, linesOf, quoteTotals, readLines, readValidUntil } from "@/lib/quotes";

export const dynamic = "force-dynamic";

const load = (id: string) => db.select().from(quotes).where(eq(quotes.id, id)).get();

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  const quote = load(params.id);
  if (!quote) return NextResponse.json({ error: "not found" }, { status: 404 });
  const patient = db.select().from(patients).where(eq(patients.id, quote.patientId)).get();
  const lines = linesOf(quote.id);
  return NextResponse.json({ ...quote, patient, lines, ...quoteTotals(lines) });
}

// Lines are replaced whole. Once a quote has become an invoice it is frozen,
// so the paper the patient agreed to and the bill can never drift apart.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const quote = load(params.id);
  if (!quote) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (quote.invoiceId) return NextResponse.json({ error: "this quote is already invoiced and cannot change" }, { status: 409 });
  const body = await req.json().catch(() => ({}));

  const changes: Record<string, unknown> = {};
  if ("status" in body) {
    if (!QUOTE_STATUSES.includes(body.status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
    changes.status = body.status;
  }
  if ("note" in body) changes.note = typeof body.note === "string" ? body.note.trim() || null : null;
  if ("validUntil" in body) {
    const v = readValidUntil(body.validUntil);
    if (v === false) return NextResponse.json({ error: "validUntil must be YYYY-MM-DD" }, { status: 400 });
    changes.validUntil = v;
  }
  const lines = "lines" in body ? readLines(body.lines) : null;
  if (typeof lines === "string") return NextResponse.json({ error: lines }, { status: 400 });
  if (!Object.keys(changes).length && !lines) return NextResponse.json({ error: "nothing to change" }, { status: 400 });

  db.transaction((tx) => {
    if (Object.keys(changes).length) tx.update(quotes).set(changes).where(eq(quotes.id, quote.id)).run();
    if (lines) {
      tx.delete(quoteLines).where(eq(quoteLines.quoteId, quote.id)).run();
      lines.forEach((l, i) => tx.insert(quoteLines).values({ id: newId("qul"), quoteId: quote.id, position: i, ...l }).run());
    }
  });
  const parts = [changes.status ? `status ${changes.status}` : "", lines ? `${lines.length} lines` : ""].filter(Boolean).join(", ");
  audit(user, "update", "quote", quote.id, `edited quote ${quote.number}${parts ? `: ${parts}` : ""}`);
  return NextResponse.json({ ok: true, ...quoteTotals(linesOf(quote.id)) });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const quote = load(params.id);
  if (!quote) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (quote.invoiceId) return NextResponse.json({ error: "an invoiced quote is kept as a record" }, { status: 409 });
  db.transaction((tx) => {
    tx.delete(quoteLines).where(eq(quoteLines.quoteId, quote.id)).run();
    tx.delete(quotes).where(eq(quotes.id, quote.id)).run();
  });
  audit(user, "delete", "quote", quote.id, `deleted quote ${quote.number}`);
  return NextResponse.json({ ok: true });
}
