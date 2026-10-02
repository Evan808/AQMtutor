import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// The whole database is one file on disk. Back it up by copying it.
export const DB_PATH = "data/tutor.db";

// In development Next.js reloads this file on every change.
// Keeping the connection on globalThis stops it opening a new one each time.
const globalForDb = globalThis as unknown as { sqlite?: Database.Database };
const sqlite = globalForDb.sqlite ?? new Database(DB_PATH);
globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
