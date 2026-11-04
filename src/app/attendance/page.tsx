"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BandChip from "@/components/BandChip";

type Person = { id: string; name: string; role: string; active: boolean };
type Row = {
  id: string;
  staffId: string;
  clockIn: number;
  clockOut: number | null;
  closedBy: string | null;
  name: string | null;
  band: "early" | "ontime" | "late" | null;
  lateBy: number;
  hours: number | null;
};
type Rules = { shiftStart: string; earlyMin: number; graceMin: number };

const hm = (ts: number) => new Date(ts * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function AttendancePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [rules, setRules] = useState<Rules | null>(null);
  const [summary, setSummary] = useState("");
  const [editRules, setEditRules] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: "", role: "assistant" });
  const [error, setError] = useState("");

  async function load() {
    const [s, a, r] = await Promise.all([fetch("/api/staff"), fetch("/api/attendance"), fetch("/api/attendance/rules")]);
    if (s.ok) setPeople(await s.json());
    if (a.ok) setRows((await a.json()).rows);
    if (r.ok) {
      const j = await r.json();
      setRules(j.rules);
      setSummary(j.summary);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function clock(staffId: string, action: "in" | "out") {
    setError("");
    const res = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staffId, action }) });
    if (!res.ok) setError((await res.json()).error || "could not save");
    load();
  }

  async function saveRules(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/attendance/rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rules) });
    if (!res.ok) return setError((await res.json()).error || "could not save the rule");
    setEditRules(false);
    load();
  }

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newPerson) });
    if (!res.ok) return setError((await res.json()).error || "could not add");
    setNewPerson({ name: "", role: "assistant" });
    load();
  }

  async function setActive(id: string, active: boolean) {
    await fetch(`/api/staff/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    load();
  }

  const active = people.filter((p) => p.active);
  const inactive = people.filter((p) => !p.active);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Attendance today</h1>
        <Link href="/attendance/report" className="text-sm text-brand">Report</Link>
      </div>

      <div className="mb-4 max-w-3xl rounded-lg border bg-white p-3 text-sm">
        {!editRules || !rules ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">
              Shift starts {rules?.shiftStart}: {summary}. Only the first arrival of the day counts.
            </span>
            <button onClick={() => setEditRules(true)} className="text-xs text-brand">Change</button>
          </div>
        ) : (
          <form onSubmit={saveRules} className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-500">Shift starts
              <input className="mt-1 block w-24 rounded border px-2 py-1" value={rules.shiftStart} onChange={(e) => setRules({ ...rules, shiftStart: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Early by (min)
              <input type="number" className="mt-1 block w-24 rounded border px-2 py-1" value={rules.earlyMin} onChange={(e) => setRules({ ...rules, earlyMin: Number(e.target.value) })} />
            </label>
            <label className="text-xs text-slate-500">Grace (min)
              <input type="number" className="mt-1 block w-24 rounded border px-2 py-1" value={rules.graceMin} onChange={(e) => setRules({ ...rules, graceMin: Number(e.target.value) })} />
            </label>
            <button className="rounded bg-brand px-3 py-1.5 text-white hover:bg-brand-dark">Save rule</button>
            <button type="button" onClick={() => { setEditRules(false); load(); }} className="text-xs text-slate-500">Cancel</button>
          </form>
        )}
      </div>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <ul className="max-w-3xl rounded-lg border bg-white text-sm">
        {active.map((p) => {
          const mine = rows.filter((r) => r.staffId === p.id);
          const open = mine.find((r) => !r.clockOut);
          return (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b p-3 last:border-0">
              <span>
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-xs text-slate-500">{p.role}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {mine.map((r) => (
                  <span key={r.id} className="flex items-center gap-1 text-xs text-slate-600">
                    {hm(r.clockIn)}
                    {r.clockOut ? ` to ${hm(r.clockOut)}` : " to now"}
                    <BandChip band={r.band} lateBy={r.lateBy} />
                  </span>
                ))}
                {mine.length === 0 && <span className="text-xs text-slate-400">not in yet</span>}
                {open ? (
                  <button onClick={() => clock(p.id, "out")} className="rounded border px-3 py-1 hover:bg-slate-100">Clock out</button>
                ) : (
                  <button onClick={() => clock(p.id, "in")} className="rounded bg-brand px-3 py-1 text-white hover:bg-brand-dark">Clock in</button>
                )}
                <button onClick={() => setActive(p.id, false)} className="text-xs text-slate-400 hover:text-red-600">Deactivate</button>
              </span>
            </li>
          );
        })}
        {active.length === 0 && <li className="p-4 text-slate-400">No staff yet. Add someone below.</li>}
      </ul>

      <form onSubmit={addPerson} className="mt-4 flex max-w-3xl flex-wrap items-end gap-2 text-sm">
        <input className="min-w-56 flex-1 rounded border px-2 py-2" placeholder="Staff name" value={newPerson.name} onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })} />
        <select className="rounded border px-2 py-2" value={newPerson.role} onChange={(e) => setNewPerson({ ...newPerson, role: e.target.value })}>
          <option value="doctor">doctor</option>
          <option value="assistant">assistant</option>
          <option value="reception">reception</option>
        </select>
        <button className="rounded border px-3 py-2 hover:bg-slate-100">Add staff</button>
      </form>

      {inactive.length > 0 && (
        <div className="mt-4 max-w-3xl text-xs text-slate-500">
          Inactive:{" "}
          {inactive.map((p) => (
            <button key={p.id} onClick={() => setActive(p.id, true)} className="mr-2 underline">
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
