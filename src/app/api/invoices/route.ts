import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { invoiceLines, invoices, patients, treatments } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { totals } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { denied } = requireUser();
  if (denied) return denied;

  const url = new URL(req.url);
  const filters = [];
  const status = url.searchParams.get("status");
  const patientId = url.searchParams.get("patientId");
  if (status) filters.push(eq(invoices.status, status));
  if (patientId) filters.push(eq(invoices.patientId, patientId));

  const rows = db
    .select({
      id: invoices.id,
      number: invoices.number,
      patientId: invoices.patientId,
      status: invoices.status,
      createdAt: invoices.createdAt,
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(invoices)
    .leftJoin(patients, eq(patients.id, invoices.patientId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(invoices.number))
    .all();

  return NextResponse.json(
    rows.map((r) => {
      const t = totals(r.id);
      return { ...r, total: t.total, paid: t.paid, balance: t.balance };
    }),
  );
}

type NewLine = { description: string; quantity: number; unitPrice: number; treatmentId: string | null };

export async function POST(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  if (!body.patientId || !db.select().from(patients).where(eq(patients.id, body.patientId)).get()) {
    return NextResponse.json({ error: "no such patient" }, { status: 400 });
  }

  const lines: NewLine[] = [];
  const treatmentIds: string[] = Array.isArray(body.treatmentIds) ? body.treatmentIds : [];
  if (treatmentIds.length) {
    const found = db.select().from(treatments).where(inArray(treatments.id, treatmentIds)).all();
    if (found.length !== new Set(treatmentIds).size) return NextResponse.json({ error: "unknown treatment" }, { status: 400 });
    for (const t of found) {
      if (t.patientId !== body.patientId) return NextResponse.json({ error: "treatment belongs to another patient" }, { status: 400 });
      if (t.status !== "done") return NextResponse.json({ error: "only done treatments can be invoiced" }, { status: 400 });
      if (t.invoiceId) return NextResponse.json({ error: "treatment is already invoiced" }, { status: 409 });
      lines.push({ description: t.tooth ? `${t.name} (tooth ${t.tooth})` : t.name, quantity: 1, unitPrice: t.price, treatmentId: t.id });
    }
  }
  for (const l of Array.isArray(body.lines) ? body.lines : []) {
    const description = typeof l.description === "string" ? l.description.trim() : "";
    const quantity = Number(l.quantity ?? 1);
    const unitPrice = Number(l.unitPrice);
    if (!description || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json({ error: "bad line" }, { status: 400 });
    }
    lines.push({ description, quantity, unitPrice, treatmentId: null });
  }
  if (!lines.length) return NextResponse.json({ error: "add at least one line" }, { status: 400 });

  const id = newId("inv");
  db.transaction((tx) => {
    const last = tx.select({ number: invoices.number }).from(invoices).orderBy(desc(invoices.number)).get();
    const next = last ? Number(last.number.replace("INV-", "")) + 1 : 1;
    tx.insert(invoices)
      .values({ id, number: `INV-${String(next).padStart(4, "0")}`, patientId: body.patientId, note: body.note || null })
      .run();
    for (const l of lines) tx.insert(invoiceLines).values({ id: newId("inl"), invoiceId: id, ...l }).run();
    for (const t of treatmentIds) tx.update(treatments).set({ invoiceId: id }).where(eq(treatments.id, t)).run();
  });

  const created = db.select({ number: invoices.number }).from(invoices).where(eq(invoices.id, id)).get();
  audit(user, "create", "invoice", id, `created invoice ${created?.number}`);
  return NextResponse.json({ id }, { status: 201 });
}
