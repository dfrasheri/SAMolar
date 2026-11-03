import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { invoiceLines, payments } from "@/db/schema";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function totals(invoiceId: string) {
  const lines = db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId)).all();
  const paid = db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).all();
  const total = round2(lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0));
  const paidSum = round2(paid.reduce((sum, p) => sum + p.amount, 0));
  return { lines, payments: paid, total, paid: paidSum, balance: round2(total - paidSum) };
}
