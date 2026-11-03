"use client";

import { useEffect, useMemo, useState } from "react";

type Apt = {
  id: string;
  title: string | null;
  startsAt: number;
  endsAt: number;
  status: string;
  firstName: string | null;
  lastName: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function CalendarPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [apts, setApts] = useState<Apt[]>([]);

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
        <span className="text-sm text-slate-500">{month.toLocaleString("en", { month: "long", year: "numeric" })}</span>
        <button className="rounded border px-2 py-1 text-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          Prev
        </button>
        <button className="rounded border px-2 py-1 text-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          Next
        </button>
      </div>

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
                  <div className="text-[10px] text-slate-500">{a.title} · {a.status}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
