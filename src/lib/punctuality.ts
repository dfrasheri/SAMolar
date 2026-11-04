// When is someone early, on time or late? Only the first clock in of a day is
// an arrival. Coming back from lunch is not judged at all.

export type Rules = { shiftStart: string; earlyMin: number; graceMin: number };
export type Band = "early" | "ontime" | "late";

export const DEFAULT_RULES: Rules = { shiftStart: "09:00", earlyMin: 10, graceMin: 15 };

export function parseHm(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// Strict, for saving: anything wrong is refused with a reason.
export function sanitizeRules(body: Record<string, unknown>): Rules | string {
  if (parseHm(body.shiftStart) === null) return "shiftStart must be HH:MM";
  const earlyMin = Number(body.earlyMin);
  const graceMin = Number(body.graceMin);
  if (!Number.isInteger(earlyMin) || earlyMin < 0 || earlyMin > 120) return "earlyMin must be 0 to 120";
  if (!Number.isInteger(graceMin) || graceMin < 0 || graceMin > 120) return "graceMin must be 0 to 120";
  return { shiftStart: body.shiftStart as string, earlyMin, graceMin };
}

// Lenient, for reading: a broken saved row falls back instead of breaking the page.
export function parseRules(raw: unknown): Rules {
  if (raw && typeof raw === "object") {
    const r = sanitizeRules(raw as Record<string, unknown>);
    if (typeof r !== "string") return r;
  }
  return DEFAULT_RULES;
}

// Both edges belong to the kinder side: exactly at the early line is early,
// exactly at the end of the grace is still on time.
export function bandFor(minuteOfDay: number, rules: Rules): Band {
  const start = parseHm(rules.shiftStart) ?? 540;
  if (minuteOfDay <= start - rules.earlyMin) return "early";
  if (minuteOfDay <= start + rules.graceMin) return "ontime";
  return "late";
}

export function minutesLate(minuteOfDay: number, rules: Rules) {
  const start = parseHm(rules.shiftStart) ?? 540;
  return Math.max(0, minuteOfDay - start);
}

// Nothing judged is not the same as everyone on time, so it is null, not 100.
export function onTimePct(bands: Band[]): number | null {
  if (!bands.length) return null;
  return Math.round((bands.filter((b) => b !== "late").length / bands.length) * 100);
}

export function rulesSummary(rules: Rules) {
  const start = parseHm(rules.shiftStart) ?? 540;
  const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return `early by ${hm(start - rules.earlyMin)}, on time until ${hm(start + rules.graceMin)}, late after that`;
}
