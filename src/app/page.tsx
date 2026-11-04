import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getCounts, getLowStock, getOpenInvoices, getOpenTasks, getOverdueRecalls, getToday } from "@/lib/dashboard";
import { todayDate } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

function Card({ label, value, href }: { label: string; value: string | number; href: string }) {
  return (
    <Link href={href} className="rounded-lg border bg-white p-4 hover:bg-slate-50">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-brand">{value}</div>
    </Link>
  );
}

export default function Home() {
  if (!getSessionUser()) redirect("/login");
  const counts = getCounts();
  const today = getToday();
  const overdue = getOverdueRecalls();
  const open = getOpenInvoices();
  const tasks = getOpenTasks();
  const lowStock = getLowStock();
  const todayStr = todayDate();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Waiting room</h1>
      <div className="grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Patients" value={counts.activePatients} href="/patients" />
        <Card label="Appointments today" value={counts.appointmentsToday} href="/calendar" />
        <Card label="Overdue recalls" value={counts.overdueRecalls} href="/recalls" />
        <Card label="Still owed" value={counts.owed.toFixed(2)} href="/invoices" />
      </div>

      <h2 className="mb-2 mt-8 font-semibold">Today</h2>
      <ul className="max-w-3xl rounded-lg border bg-white text-sm">
        {today.map((a) => (
          <li key={a.id} className="flex items-center justify-between border-b p-3 last:border-0">
            <span>
              <span className="mr-3 text-slate-500">
                {new Date(a.startsAt * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <Link href={`/patients/${a.patientId}`} className="text-brand">
                {[a.firstName, a.lastName].filter(Boolean).join(" ")}
              </Link>
              <span className="ml-2 text-slate-500">{a.title}</span>
            </span>
            <span className="text-xs text-slate-500">{a.status}</span>
          </li>
        ))}
        {today.length === 0 && <li className="p-4 text-slate-400">Nobody booked today.</li>}
      </ul>

      <h2 className="mb-2 mt-8 font-semibold">Overdue recalls</h2>
      <ul className="max-w-3xl rounded-lg border bg-white text-sm">
        {overdue.map((r) => (
          <li key={r.id} className="flex items-center justify-between border-b p-3 last:border-0">
            <span>
              <Link href={`/patients/${r.patientId}`} className="text-brand">
                {[r.firstName, r.lastName].filter(Boolean).join(" ")}
              </Link>
              <span className="ml-2 text-slate-500">{r.reason}</span>
            </span>
            <span className="text-xs text-red-600">due {r.dueDate}</span>
          </li>
        ))}
        {overdue.length === 0 && <li className="p-4 text-slate-400">Nobody is overdue.</li>}
      </ul>

      <h2 className="mb-2 mt-8 font-semibold">To do</h2>
      <ul className="max-w-3xl rounded-lg border bg-white text-sm">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center justify-between border-b p-3 last:border-0">
            <span>
              {t.title}
              <Link href={`/patients/${t.patientId}`} className="ml-2 text-brand">
                {[t.firstName, t.lastName].filter(Boolean).join(" ")}
              </Link>
            </span>
            {t.dueDate && <span className={`text-xs ${t.dueDate < todayStr ? "text-red-600" : "text-slate-500"}`}>{t.dueDate}</span>}
          </li>
        ))}
        {tasks.length === 0 && <li className="p-4 text-slate-400">All caught up.</li>}
      </ul>

      {lowStock.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 font-semibold">Running low</h2>
          <ul className="max-w-3xl rounded-lg border bg-white text-sm">
            {lowStock.map((s) => (
              <li key={s.id} className="flex items-center justify-between border-b p-3 last:border-0">
                <Link href="/stock" className="text-brand">{s.name}</Link>
                <span className="text-xs text-red-600">{s.qty} {s.unit} left, low at {s.lowAt}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mb-2 mt-8 font-semibold">Open invoices</h2>
      <ul className="max-w-3xl rounded-lg border bg-white text-sm">
        {open.map((i) => (
          <li key={i.id} className="flex items-center justify-between border-b p-3 last:border-0">
            <span>
              <Link href={`/invoices/${i.id}`} className="text-brand">{i.number}</Link>
              <span className="ml-2 text-slate-500">{[i.firstName, i.lastName].filter(Boolean).join(" ")}</span>
            </span>
            <span>{i.balance.toFixed(2)}</span>
          </li>
        ))}
        {open.length === 0 && <li className="p-4 text-slate-400">Everything is paid.</li>}
      </ul>
    </div>
  );
}
