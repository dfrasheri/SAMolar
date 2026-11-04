"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  userName: string | null;
  action: string;
  entity: string;
  summary: string | null;
  createdAt: number | null;
};

const ENTITIES = ["", "patient", "appointment", "service", "treatment", "quote", "invoice", "payment", "recall", "task", "image", "stock", "staff", "attendance", "setting", "export"];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function AuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState(ymd(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(ymd(new Date()));

  useEffect(() => {
    fetch(`/api/audit${entity ? `?entity=${entity}` : ""}`)
      .then((r) => r.json())
      .then(setRows);
  }, [entity]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Audit log</h1>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <select className="rounded border px-2 py-2" value={entity} onChange={(e) => setEntity(e.target.value)}>
        {ENTITIES.map((e) => (
          <option key={e} value={e}>{e || "everything"}</option>
        ))}
        </select>
        <span className="flex-1" />
        <input type="date" className="rounded border px-2 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="rounded border px-2 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
        <a href={`/api/audit/export?from=${from}&to=${to}${entity ? `&entity=${entity}` : ""}`} className="rounded border px-3 py-2 hover:bg-slate-100">Download CSV</a>
      </div>

      <table className="w-full rounded-lg border bg-white text-sm">
        <thead className="border-b text-left text-xs text-slate-500">
          <tr>
            <th className="p-3">When</th>
            <th className="p-3">Who</th>
            <th className="p-3">Action</th>
            <th className="p-3">What</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="p-3 text-slate-500">{r.createdAt ? new Date(r.createdAt * 1000).toLocaleString("en-GB") : ""}</td>
              <td className="p-3">{r.userName}</td>
              <td className="p-3">{r.action} {r.entity}</td>
              <td className="p-3">{r.summary}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-slate-400">Nothing logged yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
