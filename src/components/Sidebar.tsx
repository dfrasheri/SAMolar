"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Search, X } from "lucide-react";
import { NAV } from "@/lib/nav";
import { openSearch } from "@/components/CommandPalette";

const links = NAV;

// One sidebar, two ways in: a fixed rail from md up, a slide-out drawer on
// a phone. Same links either way, so the phone never misses a page.
export default function Sidebar({ userName }: { userName: string }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b bg-white px-4 py-2 md:hidden print:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open the menu" className="rounded p-2 hover:bg-slate-100">
          <Menu size={18} />
        </button>
        <span className="flex-1 font-semibold text-brand">SAMolar</span>
        <button onClick={openSearch} aria-label="Search" className="rounded p-2 hover:bg-slate-100">
          <Search size={18} />
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-slate-900/30 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-white p-4 transition-transform md:static md:z-auto md:w-56 md:translate-x-0 print:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-brand">SAMolar</span>
          <button onClick={() => setOpen(false)} aria-label="Close the menu" className="rounded p-1 hover:bg-slate-100 md:hidden">
            <X size={16} />
          </button>
        </div>
        <button onClick={openSearch} className="mb-4 flex items-center gap-2 rounded border px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-50">
          <Search size={14} />
          <span className="flex-1">Search</span>
          <kbd className="hidden text-[10px] md:inline">Ctrl K</kbd>
        </button>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded px-3 py-2 text-sm ${
                  active ? "bg-brand-soft text-brand-dark" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mb-2 text-[10px] text-slate-400">Floss daily. Commit often.</div>
        <div className="border-t pt-3 text-xs text-slate-500">
          <div className="mb-2 font-medium text-slate-700">{userName}</div>
          <button onClick={logout} className="flex items-center gap-1 hover:text-slate-900">
            <LogOut size={12} /> Spit and leave
          </button>
        </div>
      </aside>
    </>
  );
}
