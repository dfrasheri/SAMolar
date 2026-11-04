"use client";

import { useState } from "react";

type Step = { label: string; pct: number };
type Progress = Step & { due: number; covered: number; state: string };

const STATE_CLASS: Record<string, string> = {
  paid: "bg-emerald-500",
  part: "bg-amber-400",
  open: "bg-slate-200",
};

const PRESET: Step[] = [
  { label: "Deposit", pct: 30 },
  { label: "At treatment", pct: 40 },
  { label: "At the end", pct: 30 },
];

export default function PaymentPlan({
  invoiceId,
  plan,
  progress,
  editable,
  onSaved,
}: {
  invoiceId: string;
  plan: Step[];
  progress: Progress[];
  editable: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Step[]>(plan);
  const [error, setError] = useState("");

  async function save(steps: Step[]) {
    setError("");
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentPlan: steps }),
    });
    if (!res.ok) return setError((await res.json()).error || "could not save the plan");
    setEditing(false);
    onSaved();
  }

  const sum = draft.reduce((s, x) => s + (Number(x.pct) || 0), 0);

  return (
    <div className="mb-6 rounded-lg border bg-white p-3 text-sm print:hidden">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Payment plan</span>
        {editable && !editing && (
          <button onClick={() => { setDraft(plan.length ? plan : PRESET); setEditing(true); }} className="text-xs text-brand">
            {plan.length ? "Change" : "Add a plan"}
          </button>
        )}
      </div>

      {!editing && progress.length === 0 && <p className="text-slate-400">No plan. The patient pays the balance in one go.</p>}

      {!editing && progress.length > 0 && (
        <>
          <div className="mb-2 flex h-3 overflow-hidden rounded">
            {progress.map((s, i) => (
              <div key={i} style={{ width: `${s.pct}%` }} className={`${STATE_CLASS[s.state]} border-r border-white last:border-0`} title={`${s.label}: ${s.covered.toFixed(2)} of ${s.due.toFixed(2)}`} />
            ))}
          </div>
          <ul className="space-y-1">
            {progress.map((s, i) => (
              <li key={i} className="flex justify-between">
                <span>{s.label} <span className="text-xs text-slate-400">{s.pct}%</span></span>
                <span className={s.state === "paid" ? "text-emerald-700" : s.state === "part" ? "text-amber-600" : "text-slate-500"}>
                  {s.covered.toFixed(2)} of {s.due.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <div className="space-y-2">
          {draft.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="flex-1 rounded border px-2 py-1" value={s.label} onChange={(e) => setDraft(draft.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
              <input type="number" className="w-20 rounded border px-2 py-1" value={s.pct} onChange={(e) => setDraft(draft.map((x, k) => (k === i ? { ...x, pct: Number(e.target.value) } : x)))} />
              <span className="text-xs text-slate-400">%</span>
              <button onClick={() => setDraft(draft.filter((_, k) => k !== i))} className="text-xs text-slate-400 hover:text-red-600">x</button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setDraft([...draft, { label: "Step", pct: 10 }])} className="rounded border px-2 py-1 text-xs hover:bg-slate-100">Add step</button>
            <button onClick={() => setDraft(PRESET)} className="rounded border px-2 py-1 text-xs hover:bg-slate-100">30 / 40 / 30</button>
            <span className={`text-xs ${sum > 100 ? "text-red-600" : "text-slate-500"}`}>{sum}% of the total</span>
            <span className="flex-1" />
            {plan.length > 0 && <button onClick={() => save([])} className="text-xs text-slate-500 underline">Remove plan</button>}
            <button onClick={() => setEditing(false)} className="text-xs text-slate-500">Cancel</button>
            <button onClick={() => save(draft)} className="rounded bg-brand px-3 py-1 text-white hover:bg-brand-dark">Save plan</button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
}
