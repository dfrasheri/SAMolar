import { NextResponse } from "next/server";
import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { csvResponse, toCsv } from "@/lib/csv";
import { validDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const startOf = (day: string) => Math.floor(new Date(`${day}T00:00:00`).getTime() / 1000);

// The audit log for a date range, oldest first. A range keeps the read bounded.
export async function GET(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const q = new URL(req.url).searchParams;
  const from = q.get("from") ?? "";
  const to = q.get("to") ?? "";
  const entity = q.get("entity");
  if (!validDate(from) || !validDate(to) || from > to) return NextResponse.json({ error: "from and to must be YYYY-MM-DD, from first" }, { status: 400 });
  if ((startOf(to) - startOf(from)) / 86400 > 366) return NextResponse.json({ error: "at most one year at a time" }, { status: 400 });

  const rows = db
    .select()
    .from(auditLog)
    .where(and(gte(auditLog.createdAt, startOf(from)), lt(auditLog.createdAt, startOf(to) + 86400), entity ? eq(auditLog.entity, entity) : undefined))
    .orderBy(asc(auditLog.createdAt), asc(sql`rowid`))
    .all();
  const body = toCsv(
    ["When (UTC)", "Who", "Action", "Entity", "Summary"],
    rows.map((r) => [r.createdAt ? new Date(r.createdAt * 1000).toISOString().replace("T", " ").slice(0, 19) : "", r.userName, r.action, r.entity, r.summary]),
  );
  audit(user, "create", "export", null, `exported ${rows.length} audit lines from ${from} to ${to}${entity ? ` (${entity})` : ""}`);
  return csvResponse(`audit-${from}-to-${to}.csv`, body);
}
