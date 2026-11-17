/**
 * راه‌انداز پایگاه دادهٔ تست — sql.js (WASM) با همان migrationهای اپ.
 */
 
import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import type { SqlAdapter } from "@/db/client";
import { runMigrations } from "@/db/client";
import * as schema from "@/db/schema";

export function sqlJsAdapter(db: Database): SqlAdapter {
  return {
    exec(sql: string) {
      db.exec(sql);
    },
    getUserVersion() {
      const res = db.exec("PRAGMA user_version;");
      const v = res[0]?.values?.[0]?.[0];
      return typeof v === "number" ? v : 0;
    },
    setUserVersion(v: number) {
      db.run(`PRAGMA user_version = ${v};`);
    },
  };
}

export interface TestDb {
  db: ReturnType<typeof drizzle>;
  raw: Database;
}

let sqlJsModule: Awaited<ReturnType<typeof initSqlJs>> | null = null;

async function getSqlJs(): Promise<Awaited<ReturnType<typeof initSqlJs>>> {
  if (!sqlJsModule) sqlJsModule = await initSqlJs();
  return sqlJsModule;
}

/** دیتابیس در حافظه با migrationهای نسخهٔ ۱ و FK فعال */
export async function makeTestDb(): Promise<TestDb> {
  const SQL = await getSqlJs();
  const raw = new SQL.Database();
  raw.exec("PRAGMA foreign_keys = ON;");
  runMigrations(sqlJsAdapter(raw));
  const db = drizzle(raw, { schema });
  return { db, raw };
}
