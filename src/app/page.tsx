import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getCounts } from "@/lib/dashboard";

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

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Waiting room</h1>
      <div className="grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Patients" value={counts.activePatients} href="/patients" />
        <Card label="Appointments today" value={counts.appointmentsToday} href="/calendar" />
        <Card label="Overdue recalls" value={counts.overdueRecalls} href="/recalls" />
        <Card label="Still owed" value={counts.owed.toFixed(2)} href="/invoices" />
      </div>
    </div>
  );
}
