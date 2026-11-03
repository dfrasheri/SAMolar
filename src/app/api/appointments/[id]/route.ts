import { NextResponse } from "next/server";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments } from "@/db/schema";
import { pick, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const STATUSES = ["booked", "confirmed", "showed", "no-show", "cancelled"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;

  const current = db.select().from(appointments).where(eq(appointments.id, params.id)).get();
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body.status && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "bad status" }, { status: 400 });
  }

  const startsAt = body.startsAt ?? current.startsAt;
  const endsAt = body.endsAt ?? current.endsAt;
  if (!Number.isInteger(startsAt) || !Number.isInteger(endsAt) || endsAt <= startsAt) {
    return NextResponse.json({ error: "bad times" }, { status: 400 });
  }

  const status = body.status ?? current.status;
  const timesChanged = startsAt !== current.startsAt || endsAt !== current.endsAt;
  const reopened = current.status === "cancelled" && status !== "cancelled";
  if (status !== "cancelled" && (timesChanged || reopened)) {
    const clash = db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.calendarId, current.calendarId),
          ne(appointments.id, current.id),
          ne(appointments.status, "cancelled"),
          lt(appointments.startsAt, endsAt),
          gt(appointments.endsAt, startsAt),
        ),
      )
      .get();
    if (clash) return NextResponse.json({ error: "that slot is already booked" }, { status: 409 });
  }

  const changes = { ...pick(body, ["title", "notes", "status"]), startsAt, endsAt, updatedAt: Math.floor(Date.now() / 1000) };
  db.update(appointments).set(changes).where(eq(appointments.id, params.id)).run();
  const label = current.title || "appointment";
  audit(user, "update", "appointment", current.id, status !== current.status ? `set ${label} to ${status}` : timesChanged ? `moved ${label}` : `edited ${label}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const current = db.select().from(appointments).where(eq(appointments.id, params.id)).get();
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });
  db.delete(appointments).where(eq(appointments.id, params.id)).run();
  audit(user, "delete", "appointment", current.id, `deleted ${current.title || "appointment"}`);
  return NextResponse.json({ ok: true });
}
