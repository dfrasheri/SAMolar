import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patients, quotes } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { bandOf, linesOf, quoteTotals } from "@/lib/quotes";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

// A plain A4 sheet. Optional extras are listed with their price but sit
// outside the total, the same rule the editor uses.
export default function QuotePrint({ params }: { params: { id: string } }) {
  if (!getSessionUser()) redirect("/login");
  const quote = db.select().from(quotes).where(eq(quotes.id, params.id)).get();
  if (!quote) notFound();
  const patient = db.select().from(patients).where(eq(patients.id, quote.patientId)).get();
  const lines = linesOf(quote.id);
  const { total, optional } = quoteTotals(lines);
  const name = [patient?.firstName, patient?.lastName].filter(Boolean).join(" ");
  const printedAt = new Date().toLocaleString("en-GB");

  return (
    <div className="quote-sheet mx-auto max-w-[210mm] bg-white p-10 text-sm text-slate-800">
      <style dangerouslySetInnerHTML={{ __html: "@page{size:A4;margin:12mm}@media print{aside,.no-print{display:none!important}main{padding:0!important}.quote-sheet{max-width:none;padding:0}}" }} />
      <div className="no-print mb-6 flex justify-end">
        <PrintButton />
      </div>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="text-2xl font-semibold text-brand">SAMolar</div>
          <div className="text-xs text-slate-500">Demo clinic. Not a real practice.</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">Treatment quote {quote.number}</div>
          <div className="text-xs text-slate-500">{new Date((quote.createdAt ?? 0) * 1000).toLocaleDateString("en-GB")}</div>
          {quote.validUntil && <div className="text-xs text-slate-500">valid until {quote.validUntil}</div>}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-xs uppercase text-slate-500">For</div>
        <div className="font-medium">{name || "Unknown patient"}</div>
      </div>

      <table className="mb-4 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-800 text-left text-xs uppercase">
            <th className="py-2">Treatment</th>
            <th className="py-2">Tooth</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const band = bandOf(l.band);
            return (
              <tr key={l.id} className="border-b">
                <td className="py-2">
                  {l.description}
                  {band === "optional" && <span className="ml-2 text-xs italic text-slate-500">optional, not in the total</span>}
                </td>
                <td className="py-2">{l.tooth ?? ""}</td>
                <td className="py-2 text-right">{l.quantity}</td>
                <td className="py-2 text-right">{band === "free" ? "" : l.unitPrice.toFixed(2)}</td>
                <td className="py-2 text-right">{band === "free" ? "free" : (l.quantity * l.unitPrice).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="ml-auto w-72">
        <div className="flex justify-between border-t-2 border-slate-800 py-2 text-base font-semibold"><span>Total</span><span>{total.toFixed(2)}</span></div>
        {optional > 0 && <div className="flex justify-between text-xs text-slate-500"><span>Optional extras if chosen</span><span>+{optional.toFixed(2)}</span></div>}
      </div>

      {quote.note && <p className="mt-6 whitespace-pre-wrap">{quote.note}</p>}

      <p className="mt-8 text-xs text-slate-500">A quote is an estimate, not an invoice. The plan may change after the examination.</p>

      <div className="mt-16 grid grid-cols-2 gap-16 text-xs text-slate-500">
        <div className="border-t pt-1">Patient signature</div>
        <div className="border-t pt-1">Clinic</div>
      </div>

      <div className="mt-10 text-[10px] text-slate-400">Printed from SAMolar on {printedAt}</div>
    </div>
  );
}
