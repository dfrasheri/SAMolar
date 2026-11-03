"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Task = { id: string; patientId: string; title: string; dueDate: string | null; done: boolean; firstName: string | null; lastName: string | null };
type Patient = { id: string; firstName: string | null; lastName: string | null };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [form, setForm] = useState({ patientId: "", title: "", dueDate: "" });
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/tasks?status=${showDone ? "done" : "open"}`);
    if (res.ok) setTasks(await res.json());
  }

  useEffect(() => {
    load();
  }, [showDone]);

  useEffect(() => {
    fetch("/api/patients").then((r) => r.json()).then(setPatients);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) return setError((await res.json()).error || "could not add");
    setForm({ patientId: "", title: "", dueDate: "" });
    load();
  }

  async function setDone(id: string, done: boolean) {
    await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done }) });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    load();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">To do</h1>

      <form onSubmit={add} className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3 text-sm">
        <select className="rounded border px-2 py-2" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
          <option value="">Patient</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{[p.firstName, p.lastName].filter(Boolean).join(" ")}</option>
          ))}
        </select>
        <input className="min-w-64 flex-1 rounded border px-2 py-2" placeholder="What needs doing" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input type="date" className="rounded border px-2 py-2" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        <button className="rounded bg-brand px-3 py-2 text-white hover:bg-brand-dark">Add task</button>
        {error && <span className="text-red-600">{error}</span>}
      </form>

      <label className="mb-3 flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
        show finished tasks
      </label>

      <ul className="max-w-3xl rounded-lg border bg-white text-sm">
        {tasks.map((t) => {
          const overdue = !t.done && t.dueDate !== null && t.dueDate < today;
          return (
            <li key={t.id} className="flex items-center justify-between gap-3 border-b p-3 last:border-0">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={t.done} onChange={(e) => setDone(t.id, e.target.checked)} />
                <span className={t.done ? "text-slate-400 line-through" : ""}>{t.title}</span>
                <Link href={`/patients/${t.patientId}`} className="text-brand">
                  {[t.firstName, t.lastName].filter(Boolean).join(" ")}
                </Link>
              </label>
              <span className="flex items-center gap-3">
                {t.dueDate && <span className={`text-xs ${overdue ? "font-medium text-red-600" : "text-slate-500"}`}>{t.dueDate}</span>}
                <button onClick={() => remove(t.id)} className="text-xs text-slate-400 hover:text-red-600">Delete</button>
              </span>
            </li>
          );
        })}
        {tasks.length === 0 && <li className="p-4 text-slate-400">{showDone ? "Nothing finished yet." : "All caught up."}</li>}
      </ul>
    </div>
  );
}
