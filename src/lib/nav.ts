import { LayoutDashboard, Users, CalendarDays, Tag, Receipt, BellRing, ListChecks, ScrollText, Package, Clock, FileText, type LucideIcon } from "lucide-react";

// The one list of pages. The sidebar draws it and the search palette searches
// it, so a page can never be in one and missing from the other.
export type NavItem = { href: string; label: string; icon: LucideIcon; keywords?: string };

export const NAV: NavItem[] = [
  { href: "/", label: "Waiting room", icon: LayoutDashboard, keywords: "dashboard home today" },
  { href: "/patients", label: "Patients", icon: Users, keywords: "people chairs" },
  { href: "/calendar", label: "Appointments book", icon: CalendarDays, keywords: "calendar booking schedule" },
  { href: "/services", label: "Services", icon: Tag, keywords: "price list prices" },
  { href: "/quotes", label: "Quotes", icon: FileText, keywords: "estimate plan offer" },
  { href: "/invoices", label: "Invoices", icon: Receipt, keywords: "bills payments money" },
  { href: "/recalls", label: "Recall list", icon: BellRing, keywords: "reminders due back" },
  { href: "/tasks", label: "To do", icon: ListChecks, keywords: "tasks" },
  { href: "/stock", label: "Stock room", icon: Package, keywords: "inventory supplies materials" },
  { href: "/attendance", label: "Attendance", icon: Clock, keywords: "staff clock in punctuality" },
  { href: "/audit", label: "Audit log", icon: ScrollText, keywords: "history changes" },
];

// A page whose name starts with the query beats one that only contains it.
export function matchNav(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return NAV;
  return NAV.map((item) => {
    const label = item.label.toLowerCase();
    const score = label.startsWith(q) ? 3 : label.includes(q) ? 2 : item.keywords?.includes(q) ? 1 : 0;
    return { item, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}
