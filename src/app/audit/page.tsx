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

const ENTITIES = ["", "patient", "appointment", "service", "treatment", "invoice", "payment", "recall", "task", "image"];

export default function AuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [entity, setEntity] = useState("");

  useEffect(() => {
    fetch(`/api/audit${entity ? `?entity=${entity}` : ""}`)
      .then((r) => r.json())
      .then(setRows);
  }, [entity]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Audit log</h1>
      <select className="mb-3 rounded border px-2 py-2 text-sm" value={entity} onChange={(e) => setEntity(e.target.value)}>
        {ENTITIES.map((e) => (
          <option key={e} value={e}>{e || "everything"}</option>
        ))}
      </select>

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
