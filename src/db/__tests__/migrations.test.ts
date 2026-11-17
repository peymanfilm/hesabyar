import { makeTestDb, sqlJsAdapter } from "./helpers";
import { runMigrations } from "@/db/client";
import { MIGRATIONS, CURRENT_SCHEMA_VERSION } from "../migrations";

describe("migrationها — یکپارگی ساختار", () => {
  test("نسخهٔ ۰ به آخرین نسخه ارتقا می‌یابد", async () => {
    const { raw } = await makeTestDb();
    expect(sqlJsAdapter(raw).getUserVersion()).toBe(CURRENT_SCHEMA_VERSION);
    const tables = raw.exec("SELECT name FROM sqlite_master WHERE type='table'").map((r: { values: unknown[][] }) => r.values.flat());
    const names = tables.flat().map(String);
    for (const t of [
      "persons",
      "loans",
      "installments",
      "accounts",
      "account_installments",
      "transactions",
      "allocations",
      "attachments",
      "reminders",
      "settings",
      "snoozed_reminders",
    ]) {
      expect(names).toContain(t);
    }
  });

  test("اجرای دوباره migrationها اثر ندارد (idempotent)", async () => {
    const { raw } = await makeTestDb();
    const adapter = sqlJsAdapter(raw);
    const before = adapter.getUserVersion();
    runMigrations(adapter);
    expect(adapter.getUserVersion()).toBe(before);
  });

  test("downgrade از نسخهٔ بالاتر ممنوع است", async () => {
    const { raw } = await makeTestDb();
    const adapter = sqlJsAdapter(raw);
    adapter.setUserVersion(CURRENT_SCHEMA_VERSION + 1);
    expect(() => runMigrations(adapter)).toThrow();
  });

  test("MIGRATIONS به CURRENT_SCHEMA_VERSION ختم می‌شود", () => {
    expect(MIGRATIONS[MIGRATIONS.length - 1]!.version).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe("محدودیت‌های دیتابیس", () => {
  test("NOT NULL: شخص بدون نام رد می‌شود", async () => {
    const { raw } = await makeTestDb();
    expect(() => raw.run("INSERT INTO persons (name, created_at) VALUES (NULL, 'x')")).toThrow();
  });

  test("FK: تخصیص بدون تراکنش رد می‌شود", async () => {
    const { raw } = await makeTestDb();
    expect(() =>
      raw.run(
        "INSERT INTO allocations (transaction_id, target_type, target_id, amount) VALUES (999, 'account', 1, 100)"
      )
    ).toThrow();
  });

  test("FK فعال است", async () => {
    const { raw } = await makeTestDb();
    const fk = raw.exec("PRAGMA foreign_keys");
    expect(fk[0]!.values[0]![0]).toBe(1);
  });

  test("CASCADE: حذف تراکنش تخصیص‌ها را حذف می‌کند", async () => {
    const { raw } = await makeTestDb();
    raw.run(
      "INSERT INTO transactions (id, kind, amount, date, recorded_at, method, created_at) VALUES (1,'pay',100,'2025-08-03','2025-08-03T10:00:00','cash','x')"
    );
    raw.run("INSERT INTO allocations (transaction_id, target_type, target_id, amount) VALUES (1,'account',1,100)");
    raw.run("DELETE FROM transactions WHERE id = 1");
    const left = raw.exec("SELECT COUNT(*) FROM allocations");
    expect(left[0]!.values[0]![0]).toBe(0);
  });

  test("CASCADE: حذف وام اقساط را حذف می‌کند", async () => {
    const { raw } = await makeTestDb();
    raw.run(
      "INSERT INTO loans (id, title, principal, installment_count, installment_amount, first_due_date, schedule_mode, reminder_enabled, created_at, updated_at) VALUES (1,'وام',1000,2,500,'2025-08-03','monthly',1,'x','y')"
    );
    raw.run(
      "INSERT INTO installments (id, loan_id, seq, due_date, amount, created_at) VALUES (1,1,1,'2025-08-03',500,'x')"
    );
    raw.run("DELETE FROM loans WHERE id = 1");
    const left = raw.exec("SELECT COUNT(*) FROM installments");
    expect(left[0]!.values[0]![0]).toBe(0);
  });
});
