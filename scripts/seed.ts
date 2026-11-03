import crypto from "crypto";
import { db } from "../src/db/client";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const password = crypto.randomBytes(6).toString("hex");

db.insert(users)
  .values({
    id: "usr_admin",
    name: "Demo Admin",
    email: "admin@example.com",
    passwordHash: hashPassword(password),
  })
  .onConflictDoUpdate({ target: users.id, set: { passwordHash: hashPassword(password) } })
  .run();

console.log("login: admin@example.com /", password);
