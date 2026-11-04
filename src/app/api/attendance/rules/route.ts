import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { writeSetting } from "@/lib/settings";
import { rulesSummary, sanitizeRules } from "@/lib/punctuality";
import { RULES_KEY, currentRules } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function GET() {
  const { denied } = requireUser();
  if (denied) return denied;
  const rules = currentRules();
  return NextResponse.json({ rules, summary: rulesSummary(rules) });
}

// Changing the rule re-reads history. It never rewrites a stored clock in.
export async function POST(req: Request) {
  const { user, denied } = requireUser();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const rules = sanitizeRules(body);
  if (typeof rules === "string") return NextResponse.json({ error: rules }, { status: 400 });
  writeSetting(RULES_KEY, rules);
  audit(user, "update", "setting", RULES_KEY, `punctuality rule: ${rulesSummary(rules)}`);
  return NextResponse.json({ rules, summary: rulesSummary(rules) });
}
