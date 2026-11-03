import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patientImages, segmentations } from "@/db/schema";
import { newId, requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { cleanPrompt, segmentImage } from "@/lib/segment";
import { readUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";

function shape(row: typeof segmentations.$inferSelect) {
  return { id: row.id, imageId: row.imageId, prompt: row.prompt, source: row.source, objects: JSON.parse(row.objects), createdAt: row.createdAt };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;
  const rows = db.select().from(segmentations).where(eq(segmentations.imageId, params.id)).orderBy(desc(segmentations.createdAt), desc(segmentations.id)).all();
  return NextResponse.json(rows.map(shape));
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, denied } = requireUser();
  if (denied) return denied;

  const image = db.select().from(patientImages).where(eq(patientImages.id, params.id)).get();
  if (!image) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const prompt = cleanPrompt(body.prompt);
  if (!prompt) return NextResponse.json({ error: "prompt must be one to four plain words, like molar or dental implant" }, { status: 400 });

  let bytes: Buffer;
  try {
    bytes = readUpload(image.filename);
  } catch {
    return NextResponse.json({ error: "image file is missing" }, { status: 404 });
  }

  let result;
  try {
    result = await segmentImage(`data:${image.mime};base64,${bytes.toString("base64")}`, prompt, image.width, image.height);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const id = newId("seg");
  db.insert(segmentations).values({ id, imageId: image.id, prompt, source: result.source, objects: JSON.stringify(result.objects) }).run();
  audit(user, "create", "image", image.id, `segmented image for "${prompt}" (${result.source}, ${result.objects.length} found)`);

  const row = db.select().from(segmentations).where(eq(segmentations.id, id)).get()!;
  return NextResponse.json(shape(row), { status: 201 });
}
