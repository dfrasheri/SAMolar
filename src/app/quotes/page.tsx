"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Quote = {
  id: string;
  number: string;
  patientId: string;
  status: string;
  validUntil: string | null;
  invoiceId: string | null;
  firstName: string | null;
  lastName: string | null;
  total: number;
  optional: number;
};
type Patient = { id: string; firstName: string | null; lastName: string | null };

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-sky-50 text-sky-700",
  accepted: "bg-emerald-50 text-emerald-700",
  declined: "bg-red-50 text-red-700",
};

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/quotes").then((r) => r.json()).then(setQuotes);
    fetch("/api/patients").then((r) => r.json()).then(setPatients);
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId, lines: [] }) });
    const j = await res.json();
    if (!res.ok) return setError(j.error || "could not create");
    router.push(`/quotes/${j.id}`);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Quotes</h1>

      <form onSubmit={create} className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3 text-sm">
        <select className="rounded border px-2 py-2" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Patient</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{[p.firstName, p.lastName].filter(Boolean).join(" ")}</option>
          ))}
        </select>
        <button className="rounded bg-brand px-3 py-2 text-white hover:bg-brand-dark">New quote</button>
        {error && <span className="text-red-600">{error}</span>}
      </form>

      <ul className="max-w-3xl rounded-lg border bg-white text-sm">
        {quotes.map((q) => (
          <li key={q.id} className="flex items-center justify-between gap-3 border-b p-3 last:border-0">
            <span>
              <Link href={`/quotes/${q.id}`} className="font-medium text-brand">{q.number}</Link>
              <span className="ml-2 text-slate-500">{[q.firstName, q.lastName].filter(Boolean).join(" ")}</span>
              {q.invoiceId && <Link href={`/invoices/${q.invoiceId}`} className="ml-2 text-xs text-slate-500 underline">invoiced</Link>}
            </span>
            <span className="flex items-center gap-3">
              {q.optional > 0 && <span className="text-xs text-slate-400">+{q.optional.toFixed(2)} optional</span>}
              <span>{q.total.toFixed(2)}</span>
              <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_CLASS[q.status] ?? ""}`}>{q.status}</span>
            </span>
          </li>
        ))}
        {quotes.length === 0 && <li className="p-4 text-slate-400">No quotes yet.</li>}
      </ul>
    </div>
  );
}
