import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { calendars } from "@/db/schema";
import { requireUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const { denied } = requireUser();
  if (denied) return denied;
  return NextResponse.json(db.select().from(calendars).orderBy(asc(calendars.name)).all());
}
