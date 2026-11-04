// The day as a grid: one column per calendar, one row per half hour.
// Pure, so the page and any test agree on where a booking lands.

export const DAY_START = 8 * 60;
export const DAY_END = 19 * 60;
export const SLOT = 30;

export const slots = () => {
  const out: number[] = [];
  for (let m = DAY_START; m < DAY_END; m += SLOT) out.push(m);
  return out;
};

export const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export type Booking = { id: string; calendarId: string; startsAt: number; endsAt: number; status: string };

const minuteOf = (ts: number) => {
  const d = new Date(ts * 1000);
  return d.getHours() * 60 + d.getMinutes();
};

// A booking is drawn in the slot it starts in and spans as many rows as it lasts.
// Bookings outside opening hours are not hidden, they are listed apart.
export function place<T extends Booking>(bookings: T[]) {
  const inGrid: (T & { row: number; span: number })[] = [];
  const outside: T[] = [];
  for (const b of bookings) {
    const start = minuteOf(b.startsAt);
    if (start < DAY_START || start >= DAY_END) {
      outside.push(b);
      continue;
    }
    const minutes = Math.max(SLOT, Math.round((b.endsAt - b.startsAt) / 60));
    const row = Math.floor((start - DAY_START) / SLOT);
    const span = Math.min(Math.ceil(minutes / SLOT), slots().length - row);
    inGrid.push({ ...b, row, span });
  }
  return { inGrid, outside };
}

// Two live bookings in one calendar that overlap in time are a clash.
export function clashes(bookings: Booking[]) {
  const live = bookings.filter((b) => b.status !== "cancelled" && b.status !== "no-show");
  const hit = new Set<string>();
  for (const a of live)
    for (const b of live)
      if (a.id < b.id && a.calendarId === b.calendarId && a.startsAt < b.endsAt && b.startsAt < a.endsAt) {
        hit.add(a.id);
        hit.add(b.id);
      }
  return hit;
}

// Overlapping bookings in one calendar share one block, so a clash can never
// make a cell sit on top of another one in the grid.
export function blocks<T extends { calendarId: string; row: number; span: number }>(placed: T[]) {
  const out: { calendarId: string; row: number; span: number; items: T[] }[] = [];
  const byCal = new Map<string, T[]>();
  for (const p of placed) byCal.set(p.calendarId, [...(byCal.get(p.calendarId) ?? []), p]);
  for (const [calendarId, list] of byCal) {
    let current: (typeof out)[number] | null = null;
    for (const p of [...list].sort((a, b) => a.row - b.row)) {
      if (current && p.row < current.row + current.span) {
        current.span = Math.max(current.span, p.row + p.span - current.row);
        current.items.push(p);
      } else {
        current = { calendarId, row: p.row, span: p.span, items: [p] };
        out.push(current);
      }
    }
  }
  return out;
}
