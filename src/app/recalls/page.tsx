"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Fragment } from "react";
import RecallMessage from "@/components/RecallMessage";

type Recall = {
  id: string;
  patientId: string;
  dueDate: string;
  reason: string | null;
  status: string;
  contactedAt: number | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  language: string | null;
};
type Patient = { id: string; firstName: string | null; lastName: string | null };

const STATUSES = ["", "pending", "contacted", "done", "dismissed"];

export default function RecallsPage() {
  const [rows, setRows] = useState<Recall[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [status, setStatus] = useState("pending");
  const [form, setForm] = useState({ patientId: "", dueDate: "", reason: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [composing, setComposing] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/recalls${status ? `?status=${status}` : ""}`);
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    load();
  }, [status]);

  useEffect(() => {
    fetch("/api/patients").then((r) => r.json()).then(setPatients);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/recalls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) return setError((await res.json()).error || "could not add");
    setForm({ patientId: "", dueDate: "", reason: "" });
    load();
  }

  async function setRecallStatus(id: string, next: string) {
    await fetch(`/api/recalls/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    load();
  }

  async function contact(r: Recall, channel: string, lang?: string) {
    setMessage("");
    setError("");
    const res = await fetch(`/api/recalls/${r.id}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, lang }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "could not contact");
    const who = [r.firstName, r.lastName].filter(Boolean).join(" ");
    setMessage(channel === "manual" ? `Marked ${who} as contacted.` : `Stub: would send a ${channel} to ${who} in ${data.lang}. Nothing was sent, check the terminal log.`);
    setComposing(null);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Recall list</h1>

      <form onSubmit={add} className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3 text-sm">
        <select className="rounded border px-2 py-2" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
          <option value="">Patient</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{[p.firstName, p.lastName].filter(Boolean).join(" ")}</option>
          ))}
        </select>
        <input type="date" className="rounded border px-2 py-2" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        <input className="rounded border px-2 py-2" placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button className="rounded bg-brand px-3 py-2 text-white hover:bg-brand-dark">Add recall</button>
        {error && <span className="text-red-600">{error}</span>}
      </form>

      <div className="mb-3 flex items-center gap-3 text-sm">
        <select className="rounded border px-2 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || "all statuses"}</option>
          ))}
        </select>
        {message && <span className="text-slate-500">{message}</span>}
      </div>

      <table className="w-full rounded-lg border bg-white text-sm">
        <thead className="border-b text-left text-xs text-slate-500">
          <tr>
            <th className="p-3">Due</th>
            <th className="p-3">Patient</th>
            <th className="p-3">Reason</th>
            <th className="p-3">Status</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const open = r.status === "pending" || r.status === "contacted";
            const overdue = open && r.dueDate < today;
            return (
              <Fragment key={r.id}>
              <tr className="border-b last:border-0">
                <td className={`p-3 ${overdue ? "font-medium text-red-600" : ""}`}>
                  {r.dueDate}
                  {overdue && <span className="ml-1 text-xs">overdue</span>}
                </td>
                <td className="p-3">
                  <Link href={`/patients/${r.patientId}`} className="text-brand">
                    {[r.firstName, r.lastName].filter(Boolean).join(" ")}
                  </Link>
                </td>
                <td className="p-3">{r.reason}</td>
                <td className="p-3">{r.status}</td>
                <td className="space-x-3 p-3 text-right">
                  {open && (
                    <>
                      <button onClick={() => setComposing(composing === r.id ? null : r.id)} className="text-brand">Message</button>
                      {r.phone && <button onClick={() => contact(r, "sms")} className="text-brand">SMS</button>}
                      {r.phone && <button onClick={() => contact(r, "whatsapp")} className="text-brand">WhatsApp</button>}
                      {r.email && <button onClick={() => contact(r, "email")} className="text-brand">Email</button>}
                      <button onClick={() => setRecallStatus(r.id, "done")} className="text-slate-500">Done</button>
                      <button onClick={() => setRecallStatus(r.id, "dismissed")} className="text-slate-400">Dismiss</button>
                    </>
                  )}
                  {!open && (
                    <button onClick={() => setRecallStatus(r.id, "pending")} className="text-slate-500">Reopen</button>
                  )}
                </td>
              </tr>
              {composing === r.id && (
                <tr className="border-b">
                  <td colSpan={5} className="p-3">
                    <RecallMessage recall={r} onContacted={(lang) => contact(r, "manual", lang)} onClose={() => setComposing(null)} />
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-slate-400">Nobody is due. Healthy teeth all round.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
