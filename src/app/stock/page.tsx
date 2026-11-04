"use client";

import { useEffect, useState } from "react";

type Item = { id: string; name: string; unit: string; qty: number; lowAt: number | null; note: string | null; low: boolean };
type Move = { id: string; kind: string; qty: number; qtyAfter: number; note: string | null; userName: string | null; createdAt: number };

export default function StockPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ name: "", unit: "box", lowAt: "" });
  const [open, setOpen] = useState<string | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [move, setMove] = useState({ kind: "use", qty: "1", note: "" });
  const [onlyLow, setOnlyLow] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/stock");
    if (res.ok) setItems(await res.json());
  }

  async function loadMoves(id: string) {
    const res = await fetch(`/api/stock/${id}`);
    if (res.ok) setMoves((await res.json()).moves);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) return setError((await res.json()).error || "could not add");
    setForm({ name: "", unit: "box", lowAt: "" });
    load();
  }

  async function record(id: string) {
    setError("");
    const res = await fetch(`/api/stock/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(move) });
    if (!res.ok) return setError((await res.json()).error || "could not record");
    setMove({ ...move, qty: "1", note: "" });
    load();
    loadMoves(id);
  }

  async function remove(item: Item) {
    if (!confirm(`Delete "${item.name}" and its history?`)) return;
    await fetch(`/api/stock/${item.id}`, { method: "DELETE" });
    if (open === item.id) setOpen(null);
    load();
  }

  function toggle(id: string) {
    if (open === id) return setOpen(null);
    setOpen(id);
    loadMoves(id);
  }

  const shown = onlyLow ? items.filter((i) => i.low) : items;
  const lowCount = items.filter((i) => i.low).length;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Stock room</h1>

      <form onSubmit={add} className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3 text-sm">
        <input className="min-w-56 flex-1 rounded border px-2 py-2" placeholder="Item, for example gloves M" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="w-24 rounded border px-2 py-2" placeholder="unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        <input className="w-28 rounded border px-2 py-2" placeholder="low at" inputMode="decimal" value={form.lowAt} onChange={(e) => setForm({ ...form, lowAt: e.target.value })} />
        <button className="rounded bg-brand px-3 py-2 text-white hover:bg-brand-dark">Add item</button>
        {error && <span className="text-red-600">{error}</span>}
      </form>

      <label className="mb-3 flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
        only running low ({lowCount})
      </label>

      <ul className="max-w-3xl rounded-lg border bg-white text-sm">
        {shown.map((i) => (
          <li key={i.id} className="border-b last:border-0">
            <div className="flex items-center justify-between gap-3 p-3">
              <button onClick={() => toggle(i.id)} className="text-left">
                <span className="font-medium">{i.name}</span>
                {i.low && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700">running low</span>}
              </button>
              <span className="flex items-center gap-3">
                <span className={i.low ? "font-medium text-red-600" : ""}>{i.qty} {i.unit}</span>
                {i.lowAt !== null && <span className="text-xs text-slate-400">low at {i.lowAt}</span>}
                <button onClick={() => remove(i)} className="text-xs text-slate-400 hover:text-red-600">Delete</button>
              </span>
            </div>
            {open === i.id && (
              <div className="border-t bg-slate-50 p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <select className="rounded border px-2 py-1" value={move.kind} onChange={(e) => setMove({ ...move, kind: e.target.value })}>
                    <option value="use">Used</option>
                    <option value="restock">Restocked</option>
                    <option value="count">Counted, shelf holds</option>
                  </select>
                  <input className="w-20 rounded border px-2 py-1" inputMode="decimal" value={move.qty} onChange={(e) => setMove({ ...move, qty: e.target.value })} />
                  <input className="min-w-40 flex-1 rounded border px-2 py-1" placeholder="note (optional)" value={move.note} onChange={(e) => setMove({ ...move, note: e.target.value })} />
                  <button onClick={() => record(i.id)} className="rounded bg-brand px-3 py-1 text-white hover:bg-brand-dark">Record</button>
                </div>
                <ul className="space-y-1 text-xs text-slate-600">
                  {moves.map((m) => (
                    <li key={m.id}>
                      {new Date(m.createdAt * 1000).toLocaleString("en-GB")} · {m.kind} {m.qty}, left {m.qtyAfter}
                      {m.userName && <> · {m.userName}</>}
                      {m.note && <> · {m.note}</>}
                    </li>
                  ))}
                  {moves.length === 0 && <li className="text-slate-400">No moves yet. Count the shelf to start.</li>}
                </ul>
              </div>
            )}
          </li>
        ))}
        {shown.length === 0 && <li className="p-4 text-slate-400">{onlyLow ? "Nothing is running low." : "No stock items yet."}</li>}
      </ul>
    </div>
  );
}
