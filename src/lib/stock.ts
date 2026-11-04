export const MOVE_KINDS = ["use", "restock", "count"] as const;
export type MoveKind = (typeof MOVE_KINDS)[number];

// Stock only changes through a move. "use" takes away, "restock" adds,
// "count" sets the shelf to what was actually counted. Never below zero.
export function applyMove(current: number, kind: MoveKind, qty: number) {
  if (kind === "use") return Math.max(0, current - qty);
  if (kind === "restock") return current + qty;
  return Math.max(0, qty);
}

export function isLow(qty: number, lowAt: number | null) {
  return lowAt !== null && qty <= lowAt;
}

export function readMove(body: Record<string, unknown>): { kind: MoveKind; qty: number } | string {
  const kind = body.kind as MoveKind;
  if (!MOVE_KINDS.includes(kind)) return "kind must be use, restock or count";
  const qty = Number(body.qty);
  if (!Number.isFinite(qty) || qty < 0 || (kind !== "count" && qty === 0)) return "qty must be a positive number";
  if (qty > 100000) return "qty is too large";
  return { kind, qty };
}
