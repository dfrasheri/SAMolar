"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Line = { serviceId: string | null; description: string; tooth: string; quantity: number; unitPrice: number; band: string };
type Service = { id: string; name: string; price: number; active: boolean };
type Quote = {
  id: string;
  number: string;
  status: string;
  note: string | null;
  validUntil: string | null;
  invoiceId: string | null;
  patient: { id: string; firstName: string | null; lastName: string | null } | null;
  lines: (Omit<Line, "tooth"> & { tooth: number | null })[];
};

const blank: Line = { serviceId: null, description: "", tooth: "", quantity: 1, unitPrice: 0, band: "core" };
const sum = (lines: Line[], band: string) => lines.filter((l) => l.band === band).reduce((s, l) => s + l.quantity * l.unitPrice, 0);

export default function QuoteEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/quotes/${id}`);
    if (!res.ok) return setError("No such quote.");
    const q: Quote = await res.json();
    setQuote(q);
    setLines(q.lines.map((l) => ({ ...l, tooth: l.tooth ? String(l.tooth) : "" })));
    setNote(q.note ?? "");
    setValidUntil(q.validUntil ?? "");
  }

  useEffect(() => {
    load();
    fetch("/api/services").then((r) => r.json()).then((s: Service[]) => setServices(s.filter((x) => x.active)));
  }, [id]);

  const locked = Boolean(quote?.invoiceId);

  function update(i: number, patch: Partial<Line>) {
    setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  }

  function pickService(i: number, serviceId: string) {
    const s = services.find((x) => x.id === serviceId);
    update(i, s ? { serviceId: s.id, description: s.name, unitPrice: s.price } : { serviceId: null });
  }

  async function save(extra: Record<string, unknown> = {}) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines, note, validUntil, ...extra }),
    });
    const j = await res.json();
    if (!res.ok) return setError(j.error || "could not save");
    setMessage("Saved.");
    load();
  }

  async function makeInvoice() {
    setError("");
    const res = await fetch(`/api/quotes/${id}/invoice`, { method: "POST" });
    const j = await res.json();
    if (!res.ok) return setError(j.error || "could not invoice");
    router.push(`/invoices/${j.invoiceId}`);
  }

  async function remove() {
    if (!confirm("Delete this quote?")) return;
    const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error || "could not delete");
    router.push("/quotes");
  }

  if (error && !quote) return <p className="text-sm text-slate-500">{error}</p>;
  if (!quote) return <p className="text-sm text-slate-400">Loading...</p>;

  const total = sum(lines, "core");
  const optional = sum(lines, "optional");

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          Quote {quote.number}
          {quote.patient && (
            <Link href={`/patients/${quote.patient.id}`} className="ml-2 text-base font-normal text-brand">
              {[quote.patient.firstName, quote.patient.lastName].filter(Boolean).join(" ")}
            </Link>
          )}
        </h1>
        <span className="flex items-center gap-3 text-sm">
          <Link href={`/quotes/${id}/print`} className="text-brand">Print</Link>
          {!locked && <button onClick={remove} className="text-slate-400 hover:text-red-600">Delete</button>}
        </span>
      </div>

      {locked && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
          This quote became <Link href={`/invoices/${quote.invoiceId}`} className="underline">an invoice</Link> and can no longer change.
        </div>
      )}

      <fieldset disabled={locked} className="space-y-3">
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="p-2">Service</th>
                <th className="p-2">Description</th>
                <th className="p-2">Tooth</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Price</th>
                <th className="p-2">Counts as</th>
                <th className="p-2 text-right">Line</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className={`border-b last:border-0 ${l.band === "optional" ? "bg-slate-50 text-slate-500" : ""}`}>
                  <td className="p-1">
                    <select className="w-36 rounded border px-1 py-1" value={l.serviceId ?? ""} onChange={(e) => pickService(i, e.target.value)}>
                      <option value="">free text</option>
                      {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="p-1"><input className="w-full min-w-40 rounded border px-1 py-1" value={l.description} onChange={(e) => update(i, { description: e.target.value })} /></td>
                  <td className="p-1"><input className="w-14 rounded border px-1 py-1" placeholder="36" value={l.tooth} onChange={(e) => update(i, { tooth: e.target.value })} /></td>
                  <td className="p-1"><input type="number" min={1} className="w-14 rounded border px-1 py-1" value={l.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) })} /></td>
                  <td className="p-1"><input type="number" min={0} step="0.01" className="w-24 rounded border px-1 py-1" value={l.unitPrice} onChange={(e) => update(i, { unitPrice: Number(e.target.value) })} /></td>
                  <td className="p-1">
                    <select className="rounded border px-1 py-1" value={l.band} onChange={(e) => update(i, { band: e.target.value })}>
                      <option value="core">in the total</option>
                      <option value="optional">optional extra</option>
                      <option value="free">free</option>
                    </select>
                  </td>
                  <td className="p-2 text-right">{l.band === "free" ? "free" : (l.quantity * l.unitPrice).toFixed(2)}</td>
                  <td className="p-1"><button type="button" onClick={() => setLines(lines.filter((_, k) => k !== i))} className="text-xs text-slate-400 hover:text-red-600">x</button></td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-slate-400">No lines yet. Add a service below.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={() => setLines([...lines, { ...blank }])} className="rounded border px-3 py-1 text-sm hover:bg-slate-100">Add line</button>

        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="text-xs text-slate-500">Valid until
            <input type="date" className="mt-1 block rounded border px-2 py-1" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </label>
          <label className="flex-1 text-xs text-slate-500">Note for the patient
            <input className="mt-1 block w-full rounded border px-2 py-1" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>

        <div className="rounded-lg border bg-white p-3 text-sm">
          <div className="flex justify-between font-semibold"><span>Total</span><span>{total.toFixed(2)}</span></div>
          {optional > 0 && <div className="mt-1 flex justify-between text-slate-500"><span>Optional extras, not in the total</span><span>+{optional.toFixed(2)}</span></div>}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button type="button" onClick={() => save()} className="rounded bg-brand px-3 py-2 text-white hover:bg-brand-dark">Save</button>
          {quote.status === "draft" && <button type="button" onClick={() => save({ status: "sent" })} className="rounded border px-3 py-2 hover:bg-slate-100">Save and mark sent</button>}
          {(quote.status === "sent" || quote.status === "draft") && (
            <>
              <button type="button" onClick={() => save({ status: "accepted" })} className="rounded border px-3 py-2 hover:bg-slate-100">Accepted</button>
              <button type="button" onClick={() => save({ status: "declined" })} className="rounded border px-3 py-2 hover:bg-slate-100">Declined</button>
            </>
          )}
          <span className="text-xs text-slate-500">status: {quote.status}</span>
          {message && <span className="text-emerald-700">{message}</span>}
          {error && <span className="text-red-600">{error}</span>}
        </div>
      </fieldset>

      {quote.status === "accepted" && !locked && (
        <button onClick={makeInvoice} className="mt-4 rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700">Make the invoice</button>
      )}
    </div>
  );
}
