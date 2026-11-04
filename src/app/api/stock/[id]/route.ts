import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stockItems, stockMoves } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { applyMove, readMove } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  const item = db.select().from(stockItems).where(eq(stockItems.id, params.id)).get();
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  const moves = db.select().from(stockMoves).where(eq(stockMoves.itemId, item.id)).orderBy(desc(stockMoves.createdAt)).limit(50).all();
  return NextResponse.json({ item, moves });
}

// A body with "kind" records a move. Anything else edits the item itself.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const item = db.select().from(stockItems).where(eq(stockItems.id, params.id)).get();
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));

  if ("kind" in body) {
    const move = readMove(body);
    if (typeof move === "string") return NextResponse.json({ error: move }, { status: 400 });
    const qtyAfter = applyMove(item.qty, move.kind, move.qty);
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) || null : null;
    db.transaction((tx) => {
      tx.insert(stockMoves).values({ id: newId("mov"), itemId: item.id, kind: move.kind, qty: move.qty, qtyAfter, note, userName: user.name }).run();
      tx.update(stockItems).set({ qty: qtyAfter }).where(eq(stockItems.id, item.id)).run();
    });
    audit(user, "update", "stock", item.id, `${move.kind} ${move.qty} ${item.unit} of "${item.name}", now ${qtyAfter}`);
    return NextResponse.json({ qty: qtyAfter });
  }

  const changes: Record<string, unknown> = {};
  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 120) return NextResponse.json({ error: "bad name" }, { status: 400 });
    changes.name = name;
  }
  if ("lowAt" in body) {
    const lowAt = body.lowAt === "" || body.lowAt == null ? null : Number(body.lowAt);
    if (lowAt !== null && (!Number.isFinite(lowAt) || lowAt < 0)) return NextResponse.json({ error: "lowAt must be a number" }, { status: 400 });
    changes.lowAt = lowAt;
  }
  if ("note" in body) changes.note = typeof body.note === "string" ? body.note.trim().slice(0, 300) || null : null;
  if (!Object.keys(changes).length) return NextResponse.json({ error: "nothing to change" }, { status: 400 });

  db.update(stockItems).set(changes).where(eq(stockItems.id, item.id)).run();
  audit(user, "update", "stock", item.id, `edited stock item "${item.name}"`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const item = db.select().from(stockItems).where(eq(stockItems.id, params.id)).get();
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  db.transaction((tx) => {
    tx.delete(stockMoves).where(eq(stockMoves.itemId, item.id)).run();
    tx.delete(stockItems).where(eq(stockItems.id, item.id)).run();
  });
  audit(user, "delete", "stock", item.id, `deleted stock item "${item.name}"`);
  return NextResponse.json({ ok: true });
}
