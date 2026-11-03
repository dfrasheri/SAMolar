"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  number: string;
  status: string;
  createdAt: number | null;
  firstName: string | null;
  lastName: string | null;
  total: number;
  paid: number;
  balance: number;
};

const STATUSES = ["", "open", "paid", "void"];

export default function InvoicesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch(`/api/invoices${status ? `?status=${status}` : ""}`)
      .then((r) => r.json())
      .then(setRows);
  }, [status]);

  const owed = rows.filter((r) => r.status === "open").reduce((sum, r) => sum + r.balance, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Invoices</h1>
        <Link href="/invoices/new" className="rounded bg-brand px-3 py-2 text-sm text-white hover:bg-brand-dark">
          New invoice
        </Link>
      </div>

      <div className="mb-3 flex items-center gap-3 text-sm">
        <select className="rounded border px-2 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || "all statuses"}</option>
          ))}
        </select>
        <span className="text-slate-500">Still owed on open invoices: {owed.toFixed(2)}</span>
      </div>

      <table className="w-full rounded-lg border bg-white text-sm">
        <thead className="border-b text-left text-xs text-slate-500">
          <tr>
            <th className="p-3">Number</th>
            <th className="p-3">Patient</th>
            <th className="p-3">Date</th>
            <th className="p-3">Total</th>
            <th className="p-3">Paid</th>
            <th className="p-3">Balance</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="p-3">
                <Link href={`/invoices/${r.id}`} className="font-medium text-brand">{r.number}</Link>
              </td>
              <td className="p-3">{[r.firstName, r.lastName].filter(Boolean).join(" ")}</td>
              <td className="p-3">{r.createdAt ? new Date(r.createdAt * 1000).toLocaleDateString("en-GB") : ""}</td>
              <td className="p-3">{r.total.toFixed(2)}</td>
              <td className="p-3">{r.paid.toFixed(2)}</td>
              <td className="p-3">{r.balance.toFixed(2)}</td>
              <td className={`p-3 ${r.status === "paid" ? "text-brand" : r.status === "void" ? "text-slate-400" : "text-amber-700"}`}>{r.status}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-slate-400">No invoices yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
