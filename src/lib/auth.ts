import crypto from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, sessions } from "@/db/schema";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const TTL = 7 * 86400;

export function createSession(userId: string) {
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = Math.floor(Date.now() / 1000) + TTL;
  db.insert(sessions).values({ id, userId, expiresAt }).run();
  return { id, expiresAt };
}

export function destroySession(id: string) {
  db.delete(sessions).where(eq(sessions.id, id)).run();
}

export function getSessionUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = db.select().from(sessions).where(eq(sessions.id, token)).get();
  if (!session) return null;
  if (session.expiresAt < Math.floor(Date.now() / 1000)) {
    destroySession(session.id);
    return null;
  }
  return db.select().from(users).where(eq(users.id, session.userId)).get() ?? null;
}
