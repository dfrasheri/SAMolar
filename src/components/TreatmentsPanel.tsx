"use client";

import { useEffect, useState } from "react";
import ToothChart from "@/components/ToothChart";

type Treatment = {
  id: string;
  name: string;
  tooth: number | null;
  price: number;
  status: string;
  notes: string | null;
};
type Service = { id: string; name: string; price: number; active: boolean };

export default function TreatmentsPanel({ patientId }: { patientId: string }) {
  const [rows, setRows] = useState<Treatment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [tooth, setTooth] = useState<number | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/patients/${patientId}/treatments`);
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    load();
    fetch("/api/services").then((r) => r.json()).then(setServices);
  }, [patientId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!serviceId) return setError("pick a service");
    const res = await fetch(`/api/patients/${patientId}/treatments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, tooth, price, notes }),
    });
    if (!res.ok) return setError((await res.json()).error || "could not add");
    setServiceId("");
    setPrice("");
    setNotes("");
    setTooth(null);
    load();
  }

  async function patch(id: string, body: unknown) {
    await fetch(`/api/treatments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/treatments/${id}`, { method: "DELETE" });
    load();
  }

  const total = rows.reduce((sum, r) => sum + r.price, 0);

  return (
    <div className="mt-10 max-w-2xl">
      <h2 className="mb-3 text-lg font-semibold">Treatments</h2>
      <ToothChart marks={rows} selected={tooth} onSelect={setTooth} />

      <form onSubmit={add} className="my-4 flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3 text-sm">
        <select className="rounded border px-2 py-2" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">Service</option>
          {services.filter((s) => s.active).map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.price.toFixed(2)})</option>
          ))}
        </select>
        <span className="py-2 text-slate-500">{tooth ? `tooth ${tooth}` : "no tooth"}</span>
        <input className="w-24 rounded border px-2 py-2" type="number" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <input className="rounded border px-2 py-2" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="rounded bg-brand px-3 py-2 text-white hover:bg-brand-dark">Add treatment</button>
        {error && <span className="text-red-600">{error}</span>}
      </form>

      <table className="w-full rounded-lg border bg-white text-sm">
        <thead className="border-b text-left text-xs text-slate-500">
          <tr>
            <th className="p-3">Treatment</th>
            <th className="p-3">Tooth</th>
            <th className="p-3">Price</th>
            <th className="p-3">Status</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="p-3">
                {r.name}
                {r.notes && <div className="text-xs text-slate-400">{r.notes}</div>}
              </td>
              <td className="p-3">{r.tooth ?? "-"}</td>
              <td className="p-3">{r.price.toFixed(2)}</td>
              <td className="p-3">
                <button
                  onClick={() => patch(r.id, { status: r.status === "done" ? "planned" : "done" })}
                  className={r.status === "done" ? "text-brand" : "text-amber-700"}
                >
                  {r.status}
                </button>
              </td>
              <td className="p-3 text-right">
                <button onClick={() => remove(r.id)} className="text-slate-400 hover:text-red-600">Delete</button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-slate-400">No treatments yet.</td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="border-t text-sm font-medium">
            <tr>
              <td className="p-3" colSpan={2}>Total</td>
              <td className="p-3">{total.toFixed(2)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
