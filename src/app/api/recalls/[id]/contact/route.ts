import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patients, recalls } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { stub } from "@/lib/stub";

export const dynamic = "force-dynamic";

const CHANNELS = ["sms", "whatsapp", "email"];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;

  const recall = db.select().from(recalls).where(eq(recalls.id, params.id)).get();
  if (!recall) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!["pending", "contacted"].includes(recall.status)) {
    return NextResponse.json({ error: `recall is ${recall.status}` }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  if (!CHANNELS.includes(body.channel)) return NextResponse.json({ error: "bad channel" }, { status: 400 });

  const patient = db.select().from(patients).where(eq(patients.id, recall.patientId)).get();
  const to = body.channel === "email" ? patient?.email : patient?.phone;
  if (!patient || !to) return NextResponse.json({ error: `patient has no ${body.channel === "email" ? "email" : "phone"}` }, { status: 400 });

  const text = `Hi ${patient.firstName || "there"}, it is time for your ${recall.reason || "checkup"}. Call us to book a visit.`;
  stub("message", { channel: body.channel, to, text });

  db.update(recalls).set({ status: "contacted", contactedAt: Math.floor(Date.now() / 1000) }).where(eq(recalls.id, recall.id)).run();
  return NextResponse.json({ ok: true, sent: false, note: "stubbed, nothing was sent" });
}
