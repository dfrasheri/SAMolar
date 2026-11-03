"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Patient = { id: string; firstName: string | null; lastName: string | null };
type Treatment = { id: string; name: string; tooth: number | null; price: number; status: string; invoiceId: string | null };
type Line = { description: string; quantity: string; unitPrice: string };

export default function NewInvoicePage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [billable, setBillable] = useState<Treatment[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/patients").then((r) => r.json()).then(setPatients);
  }, []);

  useEffect(() => {
    setPicked([]);
    setBillable([]);
    if (!patientId) return;
    fetch(`/api/patients/${patientId}/treatments`)
      .then((r) => r.json())
      .then((rows: Treatment[]) => setBillable(rows.filter((t) => t.status === "done" && !t.invoiceId)));
  }, [patientId]);

  const total =
    billable.filter((t) => picked.includes(t.id)).reduce((sum, t) => sum + t.price, 0) +
    lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  function setLine(i: number, patch: Partial<Line>) {
    setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!patientId) return setError("pick a patient");
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        treatmentIds: picked,
        lines: lines.filter((l) => l.description.trim()),
        note,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "could not create");
    router.push(`/invoices/${data.id}`);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">New invoice</h1>
      <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-lg border bg-white p-4 text-sm">
        <select className="w-full rounded border px-2 py-2" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Patient</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{[p.firstName, p.lastName].filter(Boolean).join(" ")}</option>
          ))}
        </select>

        {patientId && (
          <div>
            <div className="mb-1 text-xs text-slate-500">Done treatments that are not invoiced yet</div>
            {billable.length === 0 && <p className="text-slate-400">None.</p>}
            {billable.map((t) => (
              <label key={t.id} className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={picked.includes(t.id)}
                  onChange={(e) => setPicked(e.target.checked ? [...picked, t.id] : picked.filter((x) => x !== t.id))}
                />
                {t.name}
                {t.tooth ? ` (tooth ${t.tooth})` : ""} <span className="text-slate-500">{t.price.toFixed(2)}</span>
              </label>
            ))}
          </div>
        )}

        <div>
          <div className="mb-1 text-xs text-slate-500">Extra lines</div>
          {lines.map((l, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input className="flex-1 rounded border px-2 py-2" placeholder="Description" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
              <input className="w-16 rounded border px-2 py-2" type="number" min="1" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
              <input className="w-24 rounded border px-2 py-2" type="number" step="0.01" placeholder="Price" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
              <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600">x</button>
            </div>
          ))}
          <button type="button" onClick={() => setLines([...lines, { description: "", quantity: "1", unitPrice: "" }])} className="text-brand">
            Add a line
          </button>
        </div>

        <input className="w-full rounded border px-2 py-2" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="flex items-center gap-4">
          <button className="rounded bg-brand px-4 py-2 text-white hover:bg-brand-dark">Create invoice</button>
          <span className="text-slate-500">Total {total.toFixed(2)}</span>
          {error && <span className="text-red-600">{error}</span>}
        </div>
      </form>
    </div>
  );
}
