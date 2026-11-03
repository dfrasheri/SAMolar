import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patientImages, patients } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { MAX_UPLOAD, saveUpload, sniffImage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  const rows = db
    .select({
      id: patientImages.id,
      width: patientImages.width,
      height: patientImages.height,
      caption: patientImages.caption,
      createdAt: patientImages.createdAt,
    })
    .from(patientImages)
    .where(eq(patientImages.patientId, params.id))
    .orderBy(asc(patientImages.createdAt))
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;

  const patient = db.select().from(patients).where(eq(patients.id, params.id)).get();
  if (!patient) return NextResponse.json({ error: "no such patient" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (file.size > MAX_UPLOAD) return NextResponse.json({ error: "file is bigger than 10 MB" }, { status: 413 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImage(bytes);
  if (!sniffed) return NextResponse.json({ error: "only png, jpeg and webp images are accepted" }, { status: 415 });

  const width = sniffed.width ?? Number(form?.get("width"));
  const height = sniffed.height ?? Number(form?.get("height"));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return NextResponse.json({ error: "could not read the image size" }, { status: 400 });
  }

  const id = newId("img");
  const caption = typeof form?.get("caption") === "string" ? String(form?.get("caption")).trim().slice(0, 200) || null : null;
  db.insert(patientImages).values({ id, patientId: patient.id, filename: saveUpload(bytes, sniffed.mime), mime: sniffed.mime, width, height, caption }).run();
  audit(user, "create", "image", id, `uploaded image for ${[patient.firstName, patient.lastName].filter(Boolean).join(" ")}`);
  return NextResponse.json({ id }, { status: 201 });
}
