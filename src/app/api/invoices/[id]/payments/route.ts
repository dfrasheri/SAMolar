import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { invoices, payments } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { round2, totals } from "@/lib/invoices";
import { stub, stubCharge } from "@/lib/stub";

export const dynamic = "force-dynamic";

const METHODS = ["cash", "card", "transfer"];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;

  const invoice = db.select().from(invoices).where(eq(invoices.id, params.id)).get();
  if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (invoice.status !== "open") return NextResponse.json({ error: `invoice is ${invoice.status}` }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  if (!METHODS.includes(body.method)) return NextResponse.json({ error: "bad method" }, { status: 400 });
  const amount = round2(Number(body.amount));
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "bad amount" }, { status: 400 });

  const before = totals(invoice.id);
  if (amount > before.balance) {
    return NextResponse.json({ error: `amount is more than the balance (${before.balance.toFixed(2)})` }, { status: 400 });
  }

  let ref: string | null = null;
  if (body.method === "card") ref = stubCharge("card", amount);
  else stub("manual payment", { invoice: invoice.number, method: body.method, amount });

  const id = newId("pay");
  const settled = round2(before.balance - amount) === 0;
  db.transaction((tx) => {
    tx.insert(payments).values({ id, invoiceId: invoice.id, amount, method: body.method, ref }).run();
    if (settled) tx.update(invoices).set({ status: "paid", paidAt: Math.floor(Date.now() / 1000) }).where(eq(invoices.id, invoice.id)).run();
  });

  audit(user, "create", "payment", id, `recorded ${amount.toFixed(2)} ${body.method} on ${invoice.number}`);
  return NextResponse.json({ id, ref, status: settled ? "paid" : "open" }, { status: 201 });
}
