import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patients, services, treatments } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { isTooth } from "@/lib/teeth";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  const rows = db.select().from(treatments).where(eq(treatments.patientId, params.id)).orderBy(asc(treatments.createdAt)).all();
  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const patient = db.select().from(patients).where(eq(patients.id, params.id)).get();
  if (!patient) return NextResponse.json({ error: "no such patient" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const service = body.serviceId ? db.select().from(services).where(eq(services.id, body.serviceId)).get() : undefined;
  if (body.serviceId && !service) return NextResponse.json({ error: "no such service" }, { status: 400 });

  const name = (typeof body.name === "string" && body.name.trim()) || service?.name;
  if (!name) return NextResponse.json({ error: "name or service required" }, { status: 400 });

  const price = body.price !== undefined && body.price !== "" ? Number(body.price) : service?.price ?? 0;
  if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "bad price" }, { status: 400 });

  const tooth = body.tooth === undefined || body.tooth === null || body.tooth === "" ? null : Number(body.tooth);
  if (tooth !== null && !isTooth(tooth)) return NextResponse.json({ error: "bad tooth number" }, { status: 400 });

  const id = newId("trt");
  db.insert(treatments)
    .values({ id, patientId: params.id, serviceId: service?.id ?? null, name, tooth, price, notes: body.notes || null })
    .run();
  audit(user, "create", "treatment", id, `planned ${name}${tooth ? ` (tooth ${tooth})` : ""} for ${[patient.firstName, patient.lastName].filter(Boolean).join(" ")}`);
  return NextResponse.json({ id }, { status: 201 });
}
