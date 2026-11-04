import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patients, recalls } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { stub } from "@/lib/stub";
import { recallLang, recallText } from "@/lib/recall-messages";

export const dynamic = "force-dynamic";

// "manual" means the desk sent it themselves, for example from the WhatsApp link.
const CHANNELS = ["sms", "whatsapp", "email", "manual"];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;

  const recall = db.select().from(recalls).where(eq(recalls.id, params.id)).get();
  if (!recall) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!["pending", "contacted"].includes(recall.status)) {
    return NextResponse.json({ error: `recall is ${recall.status}` }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  if (!CHANNELS.includes(body.channel)) return NextResponse.json({ error: "bad channel" }, { status: 400 });

  const patient = db.select().from(patients).where(eq(patients.id, recall.patientId)).get();
  if (!patient) return NextResponse.json({ error: "no such patient" }, { status: 400 });
  const lang = recallLang(body.lang ?? patient.language);
  if (body.channel !== "manual") {
    const to = body.channel === "email" ? patient.email : patient.phone;
    if (!to) return NextResponse.json({ error: `patient has no ${body.channel === "email" ? "email" : "phone"}` }, { status: 400 });
    stub("message", { channel: body.channel, to, lang, text: recallText(lang, { firstName: patient.firstName, reason: recall.reason, dueDate: recall.dueDate }) });
  }

  db.update(recalls).set({ status: "contacted", contactedAt: Math.floor(Date.now() / 1000) }).where(eq(recalls.id, recall.id)).run();
  audit(user, "update", "recall", recall.id, `contacted ${[patient.firstName, patient.lastName].filter(Boolean).join(" ")} by ${body.channel} in ${lang}${body.channel === "manual" ? "" : " (stub)"}`);
  return NextResponse.json({ ok: true, sent: false, lang, note: body.channel === "manual" ? "marked as contacted" : "stubbed, nothing was sent" });
}
