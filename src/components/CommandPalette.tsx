"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { matchNav } from "@/lib/nav";

type Hit = { key: string; label: string; sub?: string; href: string; group: string };
type Results = {
  patients: { id: string; firstName: string | null; lastName: string | null; phone: string | null; status: string }[];
  invoices: { id: string; number: string; status: string; firstName: string | null; lastName: string | null }[];
  quotes: { id: string; number: string; status: string; firstName: string | null; lastName: string | null }[];
};

const OPEN_EVENT = "samolar:open-search";
export const openSearch = () => window.dispatchEvent(new Event(OPEN_EVENT));
const name = (a: string | null, b: string | null) => [a, b].filter(Boolean).join(" ");

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [records, setRecords] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const seq = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setRecords([]);
      setActive(0);
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);

  // A slow answer for "ma" must never land on top of the answer for "mar".
  useEffect(() => {
    if (q.trim().length < 2) return setRecords([]);
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok || mine !== seq.current) return;
      const r: Results = await res.json();
      setRecords([
        ...r.patients.map((p) => ({ key: p.id, label: name(p.firstName, p.lastName), sub: [p.phone, p.status !== "active" ? p.status : ""].filter(Boolean).join(" · "), href: `/patients/${p.id}`, group: "Patients" })),
        ...r.invoices.map((i) => ({ key: i.id, label: i.number, sub: `${name(i.firstName, i.lastName)} · ${i.status}`, href: `/invoices/${i.id}`, group: "Invoices" })),
        ...r.quotes.map((x) => ({ key: x.id, label: x.number, sub: `${name(x.firstName, x.lastName)} · ${x.status}`, href: `/quotes/${x.id}`, group: "Quotes" })),
      ]);
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  if (!open) return null;

  const pages: Hit[] = matchNav(q).map((n) => ({ key: n.href, label: n.label, href: n.href, group: "Pages" }));
  const hits = [...pages, ...records];

  function go(hit: Hit | undefined) {
    if (!hit) return;
    setOpen(false);
    router.push(hit.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") go(hits[active]);
  }

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/30 p-4 pt-24" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-lg overflow-hidden rounded-lg border bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-3">
          <Search size={16} className="text-slate-400" />
          <input
            ref={input}
            className="w-full py-3 text-sm outline-none"
            placeholder="Search pages, patients, invoices, quotes"
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
          />
          <kbd className="rounded border px-1 text-[10px] text-slate-400">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1 text-sm">
          {hits.map((h, i) => {
            const header = h.group !== lastGroup ? h.group : null;
            lastGroup = h.group;
            return (
              <li key={`${h.group}-${h.key}`}>
                {header && <div className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wide text-slate-400">{header}</div>}
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(h)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left ${i === active ? "bg-brand-soft text-brand-dark" : ""}`}
                >
                  <span>{h.label}</span>
                  {h.sub && <span className="text-xs text-slate-400">{h.sub}</span>}
                </button>
              </li>
            );
          })}
          {hits.length === 0 && <li className="px-3 py-4 text-slate-400">Nothing found for &quot;{q}&quot;.</li>}
          {q.trim().length === 1 && <li className="px-3 py-1 text-xs text-slate-400">Type one more letter to search records.</li>}
        </ul>
      </div>
    </div>
  );
}
