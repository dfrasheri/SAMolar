"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Apt = {
  id: string;
  title: string | null;
  startsAt: number;
  endsAt: number;
  status: string;
  firstName: string | null;
  lastName: string | null;
};

type Cal = { id: string; name: string; durationMin: number };
type Pat = { id: string; firstName: string | null; lastName: string | null };

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function CalendarPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [apts, setApts] = useState<Apt[]>([]);
  const [cals, setCals] = useState<Cal[]>([]);
  const [pats, setPats] = useState<Pat[]>([]);
  const [form, setForm] = useState({ calendarId: "", patientId: "", date: "", time: "09:00", title: "" });
  const [error, setError] = useState("");

  const range = useMemo(() => {
    const from = Math.floor(month.getTime() / 1000);
    const to = Math.floor(new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime() / 1000);
    return { from, to };
  }, [month]);

  async function load() {
    const res = await fetch(`/api/appointments?from=${range.from}&to=${range.to}`);
    if (res.ok) setApts(await res.json());
  }

  useEffect(() => {
    load();
  }, [range.from]);

  useEffect(() => {
    fetch("/api/calendars").then((r) => r.json()).then(setCals);
    fetch("/api/patients").then((r) => r.json()).then(setPats);
  }, []);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cal = cals.find((c) => c.id === form.calendarId);
    if (!cal || !form.patientId || !form.date) return setError("pick a calendar, a patient and a date");
    const start = Math.floor(new Date(`${form.date}T${form.time}`).getTime() / 1000);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calendarId: cal.id,
        patientId: form.patientId,
        startsAt: start,
        endsAt: start + cal.durationMin * 60,
        title: form.title,
      }),
    });
    if (!res.ok) return setError((await res.json()).error || "could not book");
    setForm({ ...form, title: "" });
    load();
  }

  async function setStatus(id: string, status: string) {
    setError("");
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) setError((await res.json()).error || "could not change status");
    load();
  }

  const byDay = new Map<string, Apt[]>();
  for (const a of apts) {
    const k = dayKey(new Date(a.startsAt * 1000));
    byDay.set(k, [...(byDay.get(k) || []), a]);
  }

  const lead = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const today = dayKey(new Date());

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Appointments book</h1>
        <Link href="/calendar/day" className="text-sm text-brand">Day plan</Link>
        <span className="text-sm text-slate-500">{month.toLocaleString("en", { month: "long", year: "numeric" })}</span>
        <button className="rounded border px-2 py-1 text-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          Prev
        </button>
        <button className="rounded border px-2 py-1 text-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          Next
        </button>
      </div>

      <form onSubmit={book} className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3 text-sm">
        <select className="rounded border px-2 py-2" value={form.calendarId} onChange={(e) => setForm({ ...form, calendarId: e.target.value })}>
          <option value="">Calendar</option>
          {cals.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="rounded border px-2 py-2" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
          <option value="">Patient</option>
          {pats.map((p) => (
            <option key={p.id} value={p.id}>{[p.firstName, p.lastName].filter(Boolean).join(" ")}</option>
          ))}
        </select>
        <input type="date" className="rounded border px-2 py-2" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <input type="time" className="rounded border px-2 py-2" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        <input className="rounded border px-2 py-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <button className="rounded bg-brand px-3 py-2 text-white hover:bg-brand-dark">Book a chair</button>
        {error && <span className="text-red-600">{error}</span>}
      </form>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-slate-200 text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-slate-100 p-2 font-medium text-slate-500">{d}</div>
        ))}
        {cells.map((day, i) => {
          const key = day ? dayKey(new Date(month.getFullYear(), month.getMonth(), day)) : "";
          const list = day ? byDay.get(key) || [] : [];
          return (
            <div key={i} className="min-h-24 bg-white p-1">
              {day && <div className={`mb-1 ${key === today ? "font-semibold text-brand" : "text-slate-400"}`}>{day}</div>}
              {list.map((a) => (
                <div
                  key={a.id}
                  className={`mb-1 rounded px-1 py-0.5 ${a.status === "cancelled" ? "bg-slate-100 text-slate-400 line-through" : "bg-brand-soft text-brand-dark"}`}
                >
                  {new Date(a.startsAt * 1000).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}{" "}
                  {[a.firstName, a.lastName].filter(Boolean).join(" ")}
                  <div className="text-[10px] text-slate-500">{a.title}</div>
                  <select className="bg-transparent text-[10px]" value={a.status} onChange={(e) => setStatus(a.id, e.target.value)}>
                    {["booked", "confirmed", "showed", "no-show", "cancelled"].map((st) => (
                      <option key={st}>{st}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
