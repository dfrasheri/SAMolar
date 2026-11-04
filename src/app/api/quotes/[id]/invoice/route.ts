import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { invoiceLines, invoices, quotes } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { bandOf, linesOf } from "@/lib/quotes";

export const dynamic = "force-dynamic";

// Turns an accepted quote into an invoice. Only core lines are billed:
// optional extras were never agreed, free lines cost nothing.
export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const quote = db.select().from(quotes).where(eq(quotes.id, params.id)).get();
  if (!quote) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (quote.invoiceId) return NextResponse.json({ error: "already invoiced", invoiceId: quote.invoiceId }, { status: 409 });
  if (quote.status !== "accepted") return NextResponse.json({ error: "only an accepted quote can be invoiced" }, { status: 409 });

  const billed = linesOf(quote.id).filter((l) => bandOf(l.band) === "core");
  if (!billed.length) return NextResponse.json({ error: "the quote has no core lines to bill" }, { status: 400 });

  const id = newId("inv");
  db.transaction((tx) => {
    const last = tx.select({ number: invoices.number }).from(invoices).orderBy(desc(invoices.number)).get();
    const next = last ? Number(last.number.replace("INV-", "")) + 1 : 1;
    tx.insert(invoices).values({ id, number: `INV-${String(next).padStart(4, "0")}`, patientId: quote.patientId, note: `from quote ${quote.number}` }).run();
    for (const l of billed) {
      const description = l.tooth ? `${l.description} (tooth ${l.tooth})` : l.description;
      tx.insert(invoiceLines).values({ id: newId("inl"), invoiceId: id, description, quantity: l.quantity, unitPrice: l.unitPrice }).run();
    }
    tx.update(quotes).set({ invoiceId: id }).where(eq(quotes.id, quote.id)).run();
  });
  const created = db.select({ number: invoices.number }).from(invoices).where(eq(invoices.id, id)).get();
  audit(user, "create", "invoice", id, `created invoice ${created?.number} from quote ${quote.number}`);
  return NextResponse.json({ invoiceId: id }, { status: 201 });
}
