"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  country: string | null;
};

export default function PatientsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(q)}`);
      if (res.ok) setRows(await res.json());
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Chairs</h1>
        <Link href="/patients/new" className="rounded bg-brand px-3 py-2 text-sm text-white hover:bg-brand-dark">
          Seat a patient
        </Link>
      </div>

      <input
        className="mb-3 w-72 rounded border px-3 py-2 text-sm"
        placeholder="Search name, phone, email"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <table className="w-full rounded-lg border bg-white text-sm">
        <thead className="border-b text-left text-xs text-slate-500">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Phone</th>
            <th className="p-3">Email</th>
            <th className="p-3">Country</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="p-3">
                <Link href={`/patients/${r.id}`} className="font-medium text-brand">
                  {[r.firstName, r.lastName].filter(Boolean).join(" ") || "Unnamed"}
                </Link>
              </td>
              <td className="p-3">{r.phone}</td>
              <td className="p-3">{r.email}</td>
              <td className="p-3">{r.country}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-slate-400">Empty chair. Nobody has been drilled yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
