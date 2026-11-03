"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, CalendarDays, Tag, Receipt, LogOut } from "lucide-react";

const links = [
  { href: "/", label: "Waiting room", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/calendar", label: "Appointments book", icon: CalendarDays },
  { href: "/services", label: "Services", icon: Tag },
  { href: "/invoices", label: "Invoices", icon: Receipt },
];

export default function Sidebar({ userName }: { userName: string }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 flex-col border-r bg-white p-4">
      <div className="mb-6 text-lg font-semibold text-brand">SAMolar</div>
      <nav className="flex-1 space-y-1">
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
  );
}
