"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Line = {
  staffId: string;
  name: string;
  role: string;
  active: boolean;
  days: number;
  early: number;
  ontime: number;
  late: number;
  minutesLate: number;
  hours: number;
  autoClosed: number;
  onTimePct: number | null;
};
type Report = { from: string; to: string; onTimePct: number | null; perPerson: Line[] };

const pctClass = (p: number | null) => (p === null ? "text-slate-400" : p >= 90 ? "text-emerald-700" : p >= 75 ? "text-amber-600" : "text-red-600");

export default function AttendanceReport() {
  const [range, setRange] = useState({ from: "", to: "" });
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  async function load(from = range.from, to = range.to) {
    setError("");
    const q = from && to ? `?from=${from}&to=${to}` : "";
    const res = await fetch(`/api/attendance/report${q}`);
    const j = await res.json();
    if (!res.ok) return setError(j.error || "could not load");
    setReport(j);
    setRange({ from: j.from, to: j.to });
  }

  useEffect(() => {
    load("", "");
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Attendance report</h1>
        <Link href="/attendance" className="text-sm text-brand">Back to today</Link>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 text-sm">
        <input type="date" className="rounded border px-2 py-2" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <input type="date" className="rounded border px-2 py-2" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        <button onClick={() => load()} className="rounded bg-brand px-3 py-2 text-white hover:bg-brand-dark">Show</button>
        {error && <span className="text-red-600">{error}</span>}
      </div>

      {report && (
        <>
          <div className="mb-4 max-w-sm rounded-lg border bg-white p-4">
            <div className="text-xs text-slate-500">On time, whole team</div>
            <div className={`mt-1 text-2xl font-semibold ${pctClass(report.onTimePct)}`}>
              {report.onTimePct === null ? "no data" : `${report.onTimePct}%`}
            </div>
          </div>

          <div className="max-w-4xl overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Days</th>
                  <th className="p-2">Early</th>
                  <th className="p-2">On time</th>
                  <th className="p-2">Late</th>
                  <th className="p-2">Minutes late</th>
                  <th className="p-2">Hours</th>
                  <th className="p-2">On time %</th>
                </tr>
              </thead>
              <tbody>
                {report.perPerson.map((p) => (
                  <tr key={p.staffId} className="border-b last:border-0">
                    <td className="p-2">
                      {p.name}
                      {!p.active && <span className="ml-1 text-xs text-slate-400">(inactive)</span>}
                      {p.autoClosed > 0 && <span className="ml-1 text-xs text-amber-600">{p.autoClosed} forgot to clock out</span>}
                    </td>
                    <td className="p-2">{p.days}</td>
                    <td className="p-2 text-emerald-700">{p.early}</td>
                    <td className="p-2 text-sky-700">{p.ontime}</td>
                    <td className="p-2 text-red-600">{p.late}</td>
                    <td className="p-2">{p.minutesLate}</td>
                    <td className="p-2">{p.hours}</td>
                    <td className={`p-2 font-medium ${pctClass(p.onTimePct)}`}>{p.onTimePct === null ? "no data" : `${p.onTimePct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
