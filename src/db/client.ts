/**
 * اتصال پایگاه داده و اجرای migrationها.
 * PRAGMA foreign_keys فعال است؛ migration بر اساس user_version اجرا می‌شود
 * و دادهٔ نسخهٔ قبلی حفظ می‌ماند.
 *
 * لایهٔ آداپتور به تست اجازه می‌دهد همان migrationها را روی sql.js اجرا کند.
 */
import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { MIGRATIONS, CURRENT_SCHEMA_VERSION } from "./migrations";
import * as schema from "./schema";

/** حداقل اینترفیسی که موتور migration نیاز دارد */
export interface SqlAdapter {
  exec(sql: string): void;
  getUserVersion(): number;
  setUserVersion(v: number): void;
}

/** آداپتور expo-sqlite برای اپ */
export function expoAdapter(sqlite: ReturnType<typeof openDatabaseSync>): SqlAdapter {
  return {
    exec(sql: string) {
      sqlite.execSync(sql);
    },
    getUserVersion() {
      const rows = sqlite.execSync("PRAGMA user_version;") as unknown as {
        rows?: { user_version: number }[];
      };
      return rows?.rows?.[0] ? Number(rows.rows[0].user_version) : 0;
    },
    setUserVersion(v: number) {
      sqlite.execSync(`PRAGMA user_version = ${v};`);
    },
  };
}

export function openDatabase(name: string) {
  const sqlite = openDatabaseSync(name, { enableChangeListener: false });
  sqlite.execSync("PRAGMA journal_mode = WAL;");
  sqlite.execSync("PRAGMA foreign_keys = ON;");
  return sqlite;
}

/**
 * اجرای migrationهای نسخه‌بندی‌شده داخل تراکنش؛ خطا → rollback.
 * از نسخهٔ بالاتر به پایین اجازهٔ downgrade ندارد.
 */
export function runMigrations(
  adapter: SqlAdapter,
  migrations = MIGRATIONS,
  target = CURRENT_SCHEMA_VERSION
): { from: number; to: number } {
  const from = adapter.getUserVersion();
  if (from > target) throw new Error("نسخهٔ پایگاه دادهٔ موجود جدیدتر از اپ است");
  for (const m of migrations) {
    if (m.version <= from) continue;
    adapter.exec("BEGIN;");
    try {
      for (const st of m.statements) adapter.exec(st);
      adapter.exec("COMMIT;");
      adapter.setUserVersion(m.version);
    } catch (e) {
      adapter.exec("ROLLBACK;");
      throw e;
    }
  }
  return { from, to: target };
}

export function createDb(name: string) {
  const sqlite = openDatabase(name);
  const applied = runMigrations(expoAdapter(sqlite));
  const db = drizzle(sqlite, { schema });
  return { sqlite, db, applied };
}

export type Db = ReturnType<typeof createDb>["db"];

/** نمونهٔ تک‌کاربردی برای اپ (در تست‌ها از درایور sql-js استفاده می‌شود) */
let appDb: ReturnType<typeof createDb> | null = null;
export function getAppDb(): ReturnType<typeof createDb> {
  if (!appDb) appDb = createDb("hesabyar.db");
  return appDb;
}
