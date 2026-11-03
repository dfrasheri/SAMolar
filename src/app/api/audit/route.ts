import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { requireUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { denied } = requireUser();
  if (denied) return denied;

  const url = new URL(req.url);
  const entity = url.searchParams.get("entity");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 500);

  const rows = db
    .select()
    .from(auditLog)
    .where(entity ? eq(auditLog.entity, entity) : undefined)
    .orderBy(desc(auditLog.createdAt), desc(sql`rowid`))
    .limit(limit)
    .all();
  return NextResponse.json(rows);
}
