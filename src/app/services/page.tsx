"use client";

import { useEffect, useState } from "react";

type Service = { id: string; name: string; price: number; durationMin: number; active: boolean };

const blank = { name: "", price: "", durationMin: "30" };

export default function ServicesPage() {
  const [rows, setRows] = useState<Service[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(blank);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/services");
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function send(url: string, method: string, body: unknown) {
    setError("");
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      setError((await res.json()).error || "could not save");
      return false;
    }
    load();
    return true;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await send("/api/services", "POST", { name: form.name, price: form.price || 0, durationMin: Number(form.durationMin) })) setForm(blank);
  }

  function startEdit(s: Service) {
    setEditing(s.id);
    setDraft({ name: s.name, price: String(s.price), durationMin: String(s.durationMin) });
  }

  async function saveEdit(id: string) {
    if (await send(`/api/services/${id}`, "PATCH", { name: draft.name, price: draft.price, durationMin: Number(draft.durationMin) })) setEditing(null);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Services</h1>

      <form onSubmit={add} className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3 text-sm">
        <input className="rounded border px-2 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="w-24 rounded border px-2 py-2" type="number" step="0.01" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input className="w-24 rounded border px-2 py-2" type="number" placeholder="Minutes" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
        <button className="rounded bg-brand px-3 py-2 text-white hover:bg-brand-dark">Add service</button>
        {error && <span className="text-red-600">{error}</span>}
      </form>

      <table className="w-full max-w-3xl rounded-lg border bg-white text-sm">
        <thead className="border-b text-left text-xs text-slate-500">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Price</th>
            <th className="p-3">Minutes</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((s) =>
            editing === s.id ? (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-2"><input className="w-full rounded border px-2 py-1" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></td>
                <td className="p-2"><input className="w-24 rounded border px-2 py-1" type="number" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></td>
                <td className="p-2"><input className="w-20 rounded border px-2 py-1" type="number" value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: e.target.value })} /></td>
                <td className="p-2 text-right">
                  <button onClick={() => saveEdit(s.id)} className="mr-2 text-brand">Save</button>
                  <button onClick={() => setEditing(null)} className="text-slate-500">Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={s.id} className={`border-b last:border-0 ${s.active ? "" : "text-slate-400"}`}>
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.price.toFixed(2)}</td>
                <td className="p-3">{s.durationMin}</td>
                <td className="p-3 text-right">
                  <button onClick={() => startEdit(s)} className="mr-3 text-brand">Edit</button>
                  <button onClick={() => send(`/api/services/${s.id}`, "PATCH", { active: !s.active })} className="text-slate-500">
                    {s.active ? "Hide" : "Show"}
                  </button>
                </td>
              </tr>
            ),
          )}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-slate-400">No services yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
