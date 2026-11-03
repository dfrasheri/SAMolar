import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { _sqlite?: Database.Database };

const sqlite = globalForDb._sqlite ?? new Database(process.env.DB_FILE || "./samolar.db", { timeout: 5000 });
if (process.env.NODE_ENV !== "production") globalForDb._sqlite = sqlite;

sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
