import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { patientImages } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { readUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { denied } = requireUser();
  if (denied) return denied;

  const image = db.select().from(patientImages).where(eq(patientImages.id, params.id)).get();
  if (!image) return NextResponse.json({ error: "not found" }, { status: 404 });

  let bytes: Buffer;
  try {
    bytes = readUpload(image.filename);
  } catch {
    return NextResponse.json({ error: "file is missing" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
