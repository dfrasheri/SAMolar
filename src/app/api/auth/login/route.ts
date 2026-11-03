import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const user = db.select().from(users).where(eq(users.email, String(email).toLowerCase())).get();
  if (!user || !verifyPassword(String(password), user.passwordHash)) {
    return NextResponse.json({ error: "wrong email or password" }, { status: 401 });
  }

  const session = createSession(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt * 1000),
  });
  return res;
}
