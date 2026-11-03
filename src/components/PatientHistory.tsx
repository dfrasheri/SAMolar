"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Apt = { id: string; title: string | null; startsAt: number; status: string };
type Inv = { id: string; number: string; status: string; total: number; balance: number };

export default function PatientHistory({ patientId }: { patientId: string }) {
  const [apts, setApts] = useState<Apt[]>([]);
  const [invs, setInvs] = useState<Inv[]>([]);

  useEffect(() => {
    fetch(`/api/appointments?patientId=${patientId}`).then((r) => r.json()).then(setApts);
    fetch(`/api/invoices?patientId=${patientId}`).then((r) => r.json()).then(setInvs);
  }, [patientId]);

  const when = (t: number) =>
    new Date(t * 1000).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Appointments</h2>
        <ul className="rounded-lg border bg-white text-sm">
          {[...apts].reverse().map((a) => (
            <li key={a.id} className="flex justify-between border-b p-3 last:border-0">
              <span>
                {when(a.startsAt)}
                <span className="ml-2 text-slate-500">{a.title}</span>
              </span>
              <span className="text-xs text-slate-500">{a.status}</span>
            </li>
          ))}
          {apts.length === 0 && <li className="p-3 text-slate-400">No appointments.</li>}
        </ul>
      </div>
      <div>
        <h2 className="mb-2 text-lg font-semibold">Invoices</h2>
        <ul className="rounded-lg border bg-white text-sm">
          {invs.map((i) => (
            <li key={i.id} className="flex justify-between border-b p-3 last:border-0">
              <Link href={`/invoices/${i.id}`} className="text-brand">{i.number}</Link>
              <span className="text-slate-500">
                {i.total.toFixed(2)} · {i.status}
                {i.status === "open" ? ` · owes ${i.balance.toFixed(2)}` : ""}
              </span>
            </li>
          ))}
          {invs.length === 0 && <li className="p-3 text-slate-400">No invoices.</li>}
        </ul>
      </div>
    </div>
  );
}
