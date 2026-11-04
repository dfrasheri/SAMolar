"use client";

import { useEffect, useState } from "react";
import PaymentPlan from "@/components/PaymentPlan";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Invoice = {
  id: string;
  number: string;
  status: string;
  note: string | null;
  createdAt: number | null;
  patient: { id: string; firstName: string | null; lastName: string | null } | null;
  lines: { id: string; description: string; quantity: number; unitPrice: number }[];
  payments: { id: string; amount: number; method: string; ref: string | null; createdAt: number | null }[];
  total: number;
  paid: number;
  balance: number;
  plan: { label: string; pct: number }[];
  planProgress: { label: string; pct: number; due: number; covered: number; state: string }[];
};

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [missing, setMissing] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/invoices/${id}`);
    if (!res.ok) return setMissing(true);
    const data: Invoice = await res.json();
    setInv(data);
    setAmount(data.balance > 0 ? data.balance.toFixed(2) : "");
  }

  useEffect(() => {
    load();
  }, [id]);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/invoices/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method }),
    });
    if (!res.ok) return setError((await res.json()).error || "could not record payment");
    load();
  }

  async function voidInvoice() {
    setError("");
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "void" }),
    });
    if (!res.ok) return setError((await res.json()).error || "could not void");
    router.push("/invoices");
  }

  if (missing) return <p className="text-sm text-slate-500">No such invoice.</p>;
  if (!inv) return <p className="text-sm text-slate-400">Loading...</p>;

  const date = (t: number | null) => (t ? new Date(t * 1000).toLocaleDateString("en-GB") : "");

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{inv.number}</h1>
        <div className="flex items-center gap-4 text-sm">
          <button onClick={() => window.print()} className="text-slate-500 underline">Print</button>
          <Link href="/invoices" className="text-slate-500 underline">Back</Link>
        </div>
      </div>

      <div className="mb-4 rounded-lg border bg-white p-4 text-sm">
        <div>
          Patient:{" "}
          {inv.patient ? (
            <Link href={`/patients/${inv.patient.id}`} className="text-brand">
              {[inv.patient.firstName, inv.patient.lastName].filter(Boolean).join(" ")}
            </Link>
          ) : (
            "unknown"
          )}
        </div>
        <div>Date: {date(inv.createdAt)}</div>
        <div>Status: {inv.status}</div>
        {inv.note && <div className="text-slate-500">{inv.note}</div>}
      </div>

      <table className="mb-4 w-full rounded-lg border bg-white text-sm">
        <thead className="border-b text-left text-xs text-slate-500">
          <tr>
            <th className="p-3">Description</th>
            <th className="p-3">Qty</th>
            <th className="p-3">Price</th>
            <th className="p-3">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l) => (
            <tr key={l.id} className="border-b last:border-0">
              <td className="p-3">{l.description}</td>
              <td className="p-3">{l.quantity}</td>
              <td className="p-3">{l.unitPrice.toFixed(2)}</td>
              <td className="p-3">{(l.quantity * l.unitPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t text-sm">
          <tr><td className="p-3 font-medium" colSpan={3}>Total</td><td className="p-3 font-medium">{inv.total.toFixed(2)}</td></tr>
          <tr><td className="p-3" colSpan={3}>Paid</td><td className="p-3">{inv.paid.toFixed(2)}</td></tr>
          <tr><td className="p-3 font-medium" colSpan={3}>Balance</td><td className="p-3 font-medium">{inv.balance.toFixed(2)}</td></tr>
        </tfoot>
      </table>

      <PaymentPlan invoiceId={inv.id} plan={inv.plan} progress={inv.planProgress} editable={inv.status !== "void"} onSaved={load} />

      <h2 className="mb-2 font-semibold">Payments</h2>
      <ul className="mb-4 rounded-lg border bg-white text-sm">
        {inv.payments.map((p) => (
          <li key={p.id} className="flex justify-between border-b p-3 last:border-0">
            <span>{date(p.createdAt)} · {p.method}{p.ref ? ` · ${p.ref}` : ""}</span>
            <span>{p.amount.toFixed(2)}</span>
          </li>
        ))}
        {inv.payments.length === 0 && <li className="p-3 text-slate-400">No payments yet.</li>}
      </ul>

      {inv.status === "open" && (
        <form onSubmit={pay} className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3 text-sm print:hidden">
          <input className="w-28 rounded border px-2 py-2" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className="rounded border px-2 py-2" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">cash</option>
            <option value="card">card (stubbed)</option>
            <option value="transfer">transfer</option>
          </select>
          <button className="rounded bg-brand px-3 py-2 text-white hover:bg-brand-dark">Record payment</button>
          {inv.payments.length === 0 && (
            <button type="button" onClick={voidInvoice} className="text-slate-500 underline">Void invoice</button>
          )}
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-6 text-xs text-slate-400">Card payments are a stub: nothing is charged, the app only logs what it would do.</p>
    </div>
  );
}
