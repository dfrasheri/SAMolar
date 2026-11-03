import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { invoices, patients, treatments } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { totals } from "@/lib/invoices";

export const dynamic = "force-dynamic";

function find(id: string) {
  return db.select().from(invoices).where(eq(invoices.id, id)).get();
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  const invoice = find(params.id);
  if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });
  const patient = db.select().from(patients).where(eq(patients.id, invoice.patientId)).get();
  return NextResponse.json({ ...invoice, patient: patient ?? null, ...totals(invoice.id) });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  const invoice = find(params.id);
  if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if ("note" in body) db.update(invoices).set({ note: body.note || null }).where(eq(invoices.id, invoice.id)).run();

  if (body.status === "void") {
    if (invoice.status === "void") return NextResponse.json({ ok: true });
    if (totals(invoice.id).payments.length) {
      return NextResponse.json({ error: "an invoice with payments cannot be voided" }, { status: 409 });
    }
    db.transaction((tx) => {
      tx.update(invoices).set({ status: "void" }).where(eq(invoices.id, invoice.id)).run();
      tx.update(treatments).set({ invoiceId: null }).where(eq(treatments.invoiceId, invoice.id)).run();
    });
  } else if (body.status) {
    return NextResponse.json({ error: "status can only be set to void" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
