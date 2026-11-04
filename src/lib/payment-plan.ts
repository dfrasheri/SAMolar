import { round2 } from "@/lib/invoices";

// A payment plan is an agreement, never money. How much of each step is paid
// is worked out from the real payments every time it is read, in order, so a
// step can never claim money the ledger does not have.

export type Step = { label: string; pct: number };

export const DEFAULT_PLAN: Step[] = [
  { label: "Deposit", pct: 30 },
  { label: "At treatment", pct: 40 },
  { label: "At the end", pct: 30 },
];

// Lenient, for reading: junk steps are skipped so the page still draws.
export function parsePlan(raw: string | null): Step[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((s) => s && typeof s.label === "string" && Number.isFinite(s.pct) && s.pct > 0);
  } catch {
    return [];
  }
}

// Strict, for saving.
export function sanitizePlan(raw: unknown): Step[] | string {
  if (!Array.isArray(raw)) return "plan must be a list of steps";
  if (raw.length > 8) return "at most 8 steps";
  const out: Step[] = [];
  for (const [i, s] of raw.entries()) {
    const label = typeof s?.label === "string" ? s.label.trim() : "";
    if (!label || label.length > 60) return `step ${i + 1}: label required`;
    const pct = Number(s.pct);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return `step ${i + 1}: percent must be above 0 and at most 100`;
    out.push({ label, pct: Math.round(pct * 10) / 10 });
  }
  const sum = out.reduce((s, x) => s + x.pct, 0);
  if (sum > 100.001) return `the steps add up to ${sum}%, more than 100%`;
  return out;
}

export function planProgress(plan: Step[], total: number, paid: number) {
  let left = paid;
  return plan.map((s) => {
    const due = round2((total * s.pct) / 100);
    const covered = round2(Math.min(due, Math.max(0, left)));
    left = round2(left - covered);
    return { ...s, due, covered, state: covered >= due ? "paid" : covered > 0 ? "part" : "open" };
  });
}
