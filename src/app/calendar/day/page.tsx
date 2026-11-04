"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { blocks, clashes, hm, place, slots } from "@/lib/day-plan";

type Calendar = { id: string; name: string };
type Appt = {
  id: string;
  calendarId: string;
  patientId: string;
  title: string | null;
  startsAt: number;
  endsAt: number;
  status: string;
  firstName: string | null;
  lastName: string | null;
};

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (day: string, by: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + by);
  return ymd(d);
};
const STATUS_CLASS: Record<string, string> = {
  booked: "border-sky-300 bg-sky-50",
  confirmed: "border-emerald-300 bg-emerald-50",
  showed: "border-slate-300 bg-slate-100",
  "no-show": "border-red-200 bg-red-50 text-red-700 line-through",
  cancelled: "border-slate-200 bg-white text-slate-400 line-through",
};

export default function DayPlan() {
  const [day, setDay] = useState(ymd(new Date()));
  const [cals, setCals] = useState<Calendar[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(true);
  const [printedAt, setPrintedAt] = useState("");

  useEffect(() => {
    let live = true;
    fetch(`/api/day-plan?date=${day}`).then(async (r) => {
      if (!r.ok || !live) return;
      const j = await r.json();
      setCals(j.calendars);
      setAppts(j.appointments);
      setNote(j.note);
      setNoteSaved(true);
    });
    return () => {
      live = false;
    };
  }, [day]);

  // Stamped in the browser, never during render, so server and client agree.
  useEffect(() => {
    const stamp = () => setPrintedAt(new Date().toLocaleString("en-GB"));
    stamp();
    window.addEventListener("beforeprint", stamp);
    return () => window.removeEventListener("beforeprint", stamp);
  }, []);

  async function saveNote() {
    await fetch("/api/day-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: day, note }) });
    setNoteSaved(true);
  }

  const rows = slots();
  const { inGrid, outside } = place(appts);
  const clash = clashes(appts);
  const grid = blocks(inGrid);
  const title = new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="day-plan">
      <style dangerouslySetInnerHTML={{ __html: "@page{size:A4 landscape;margin:10mm}@media print{aside,.no-print{display:none!important}main{padding:0!important}.day-plan table{font-size:9px}.day-plan td,.day-plan th{border-color:#000!important}.day-plan .cell{print-color-adjust:exact;-webkit-print-color-adjust:exact}}" }} />

      <div className="no-print mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/calendar" className="text-brand">Appointments book</Link>
        <span className="flex-1" />
        <button onClick={() => setDay(shift(day, -1))} className="rounded border px-2 py-1 hover:bg-slate-100" aria-label="Previous day">Prev</button>
        <input type="date" className="rounded border px-2 py-1" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        <button onClick={() => setDay(shift(day, 1))} className="rounded border px-2 py-1 hover:bg-slate-100" aria-label="Next day">Next</button>
        <button onClick={() => setDay(ymd(new Date()))} className="rounded border px-2 py-1 hover:bg-slate-100">Today</button>
        <button onClick={() => window.print()} className="rounded bg-brand px-3 py-1 text-white hover:bg-brand-dark">Print</button>
      </div>

      <h1 className="mb-3 text-lg font-semibold">Day plan, {title}</h1>

      {clash.size > 0 && <div className="no-print mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">{clash.size} bookings overlap in the same calendar.</div>}

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-16 border bg-slate-50 p-1 text-left">Time</th>
              {cals.map((c) => <th key={c.id} className="border bg-slate-50 p-1 text-left">{c.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((m, r) => (
              <tr key={m} className="h-8">
                <td className="border p-1 align-top text-slate-500">{hm(m)}</td>
                {cals.map((c) => {
                  const block = grid.find((b) => b.calendarId === c.id && b.row === r);
                  if (!block && grid.some((b) => b.calendarId === c.id && b.row < r && b.row + b.span > r)) return null;
                  return (
                    <td key={c.id} rowSpan={block?.span ?? 1} className="border p-0.5 align-top">
                      {(block?.items ?? []).map((a) => (
                        <Link
                          key={a.id}
                          href={`/patients/${a.patientId}`}
                          className={`cell mb-0.5 block rounded border px-1 py-0.5 ${STATUS_CLASS[a.status] ?? ""} ${clash.has(a.id) ? "ring-2 ring-amber-400" : ""}`}
                        >
                          <span className="font-medium">{[a.firstName, a.lastName].filter(Boolean).join(" ")}</span>
                          <span className="block text-[10px] text-slate-600">{hm(new Date(a.startsAt * 1000).getHours() * 60 + new Date(a.startsAt * 1000).getMinutes())} {a.title}</span>
                        </Link>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {outside.length > 0 && (
        <div className="mt-3 text-xs">
          <div className="font-medium">Outside opening hours</div>
          {outside.map((a) => (
            <div key={a.id}>{new Date(a.startsAt * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} {[a.firstName, a.lastName].filter(Boolean).join(" ")} {a.title}</div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <div className="mb-1 text-sm font-medium">Notes</div>
        <textarea
          className="h-20 w-full rounded border p-2 text-sm"
          value={note}
          onChange={(e) => { setNote(e.target.value); setNoteSaved(false); }}
          onBlur={() => !noteSaved && saveNote()}
          placeholder="Anything the team should know today"
        />
        {!noteSaved && <div className="no-print text-xs text-slate-400">saves when you click away</div>}
      </div>

      <div className="mt-4 text-[10px] text-slate-400">Printed from SAMolar on {printedAt} for {day}</div>
    </div>
  );
}
