/**
 * پشتیبان‌گیری و بازیابی — فرمت JSON نسخه‌بندی‌شده.
 * اعتبارسنجی کامل پیش از بازیابی؛ فایل خراب هرگز دادهٔ موجود را تخریب نمی‌کند.
 * رسیدها به‌صورت base64 در فایل پشتیبان گنجانده می‌شوند.
 *
 * توجه: فایل پشتیبان رمزگذاری‌شده نیست — این موضوع در رابط کاربر صریحاً اعلام می‌شود.
 */
import { eq } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as t from "@/db/schema";
import { CURRENT_SCHEMA_VERSION } from "@/db/migrations";
import { MAX_RIAL } from "./money";
import { isISODate } from "./dates";

 
type AnySyncDb = BaseSQLiteDatabase<"sync", any, any, any>;

export const BACKUP_FORMAT = "hesabyar-backup";
export const BACKUP_VERSION = 1;

export interface BackupPayload {
  format: string;
  version: number;
  schemaVersion: number;
  exportedAt: string;
  counts: Record<string, number>;
  data: {
    persons: t.Person[];
    loans: t.Loan[];
    installments: t.Installment[];
    accounts: t.Account[];
    accountInstallments: t.AccountInstallment[];
    transactions: t.Transaction[];
    allocations: t.Allocation[];
    attachments: t.Attachment[];
    reminders: t.Reminder[];
    settings: t.Setting[];
    snoozedReminders: t.SnoozedReminder[];
  };
  receipts: { fileName: string; base64: string }[];
}

export class BackupError extends Error {}

/** ساخت پشتیبان از دیتابیس جاری */
export function buildBackup(
  db: AnySyncDb,
  receipts: { fileName: string; base64: string }[],
  exportedAt: string
): BackupPayload {
  const data = {
    persons: db.select().from(t.persons).all(),
    loans: db.select().from(t.loans).all(),
    installments: db.select().from(t.installments).all(),
    accounts: db.select().from(t.accounts).all(),
    accountInstallments: db.select().from(t.accountInstallments).all(),
    transactions: db.select().from(t.transactions).all(),
    allocations: db.select().from(t.allocations).all(),
    attachments: db.select().from(t.attachments).all(),
    reminders: db.select().from(t.reminders).all(),
    settings: db.select().from(t.settings).all(),
    snoozedReminders: db.select().from(t.snoozedReminders).all(),
  };
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt,
    counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
    data,
    receipts,
  };
}

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isSafeMoney = (v: unknown) => isInt(v) && v >= 0 && v <= MAX_RIAL;

/** اعتبارسنجی ساختاری و محتوایی فایل پشتیبان — قبل از هر تغییر در داده */
export function validateBackup(raw: string, maxSchemaVersion = CURRENT_SCHEMA_VERSION): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupError("فایل پشتیبان قابل خواندن نیست (JSON نامعتبر)");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    throw new BackupError("ساختار فایل پشتیبان نامعتبر است");
  const p = parsed as Record<string, unknown>;
  if (p.format !== BACKUP_FORMAT) throw new BackupError("این فایل پشتیبان حساب‌یار نیست");
  if (!isInt(p.version) || p.version < 1 || p.version > BACKUP_VERSION)
    throw new BackupError("نسخهٔ فایل پشتیبان پشتیبانی نمی‌شود");
  if (!isInt(p.schemaVersion) || p.schemaVersion < 1 || p.schemaVersion > maxSchemaVersion)
    throw new BackupError("نسخهٔ ساختار دادهٔ فایل پشتیبان از نسخهٔ اپ جدیدتر است");
  const data = p.data;
  if (typeof data !== "object" || data === null || Array.isArray(data))
    throw new BackupError("بخش دادهٔ فایل پشتیبان نامعتبر است");
  const d = data as Record<string, unknown>;
  for (const key of ["persons", "loans", "installments", "accounts", "accountInstallments", "transactions", "allocations", "attachments", "reminders", "settings", "snoozedReminders"]) {
    if (!Array.isArray(d[key])) throw new BackupError(`بخش ${key} در فایل پشتیبان موجود نیست`);
  }

  // اعتبارسنجی ردیف‌ها
  for (const row of d.transactions as unknown[]) {
    const r = row as Record<string, unknown>;
    if (!isStr(r.kind) || !["pay", "receive"].includes(r.kind))
      throw new BackupError("تراکنش با نوع نامعتبر در فایل پشتیبان");
    if (!isSafeMoney(r.amount)) throw new BackupError("مبلغ تراکنش نامعتبر است");
    if (!isStr(r.date) || !isISODate(r.date)) throw new BackupError("تاریخ تراکنش نامعتبر است");
  }
  for (const row of d.allocations as unknown[]) {
    const r = row as Record<string, unknown>;
    if (!isSafeMoney(r.amount)) throw new BackupError("مبلغ تخصیص نامعتبر است");
    if (!isStr(r.targetType)) throw new BackupError("نوع تخصیص نامعتبر است");
  }
  for (const row of d.accounts as unknown[]) {
    const r = row as Record<string, unknown>;
    if (!isSafeMoney(r.initialAmount)) throw new BackupError("مبلغ اولیهٔ حساب نامعتبر است");
    if (!isStr(r.kind) || !["receivable", "debt"].includes(r.kind))
      throw new BackupError("نوع حساب نامعتبر است");
  }
  for (const row of d.loans as unknown[]) {
    const r = row as Record<string, unknown>;
    if (!isSafeMoney(r.principal)) throw new BackupError("اصل وام نامعتبر است");
    if (r.totalRepay != null && !isSafeMoney(r.totalRepay))
      throw new BackupError("کل بازپرداخت نامعتبر است");
  }
  for (const row of d.installments as unknown[]) {
    const r = row as Record<string, unknown>;
    if (!isSafeMoney(r.amount)) throw new BackupError("مبلغ قسط نامعتبر است");
    if (!isStr(r.dueDate) || !isISODate(r.dueDate)) throw new BackupError("سررسید قسط نامعتبر است");
  }
  // جمع پرداخت هر هدف نباید از مبلغ هدف بیشتر باشد (سازگاری درونی)
  const instAmount = new Map<number, number>();
  for (const row of (d.installments as Record<string, unknown>[])) {
    instAmount.set(Number(row.id), Number(row.amount));
  }
  const accAmount = new Map<number, number>();
  for (const row of (d.accounts as Record<string, unknown>[])) {
    accAmount.set(Number(row.id), Number(row.initialAmount));
  }
  const paidByInst = new Map<number, number>();
  const paidByAcc = new Map<number, number>();
  for (const row of (d.allocations as Record<string, unknown>[])) {
    const amt = Number(row.amount);
    if (row.targetType === "loan_installment") paidByInst.set(Number(row.targetId), (paidByInst.get(Number(row.targetId)) ?? 0) + amt);
    if (row.targetType === "account") paidByAcc.set(Number(row.targetId), (paidByAcc.get(Number(row.targetId)) ?? 0) + amt);
  }
  for (const [id, paid] of paidByInst) {
    if (paid > (instAmount.get(id) ?? 0)) throw new BackupError("جمع پرداخت قسط از مبلغ قسط بیشتر است");
  }
  for (const [id, paid] of paidByAcc) {
    if (paid > (accAmount.get(id) ?? 0)) throw new BackupError("جمع تراکنش حساب از مبلغ اولیه بیشتر است");
  }
  if (!Array.isArray(p.receipts)) throw new BackupError("بخش رسیدها نامعتبر است");
  for (const row of p.receipts as unknown[]) {
    const r = row as Record<string, unknown>;
    if (typeof r !== "object" || r === null) throw new BackupError("رسید در فایل پشتیبان ناقص است");
    if (!isStr(r.fileName) || !isStr(r.base64)) throw new BackupError("رسید در فایل پشتیبان ناقص است");
    if (!/^[A-Za-z0-9+/=\s]*$/.test(r.base64)) throw new BackupError("محتوای رسید نامعتبر است");
  }
  return p as unknown as BackupPayload;
}

/**
 * بازیابی: ابتدا اعتبارسنجی کامل، سپس پاک‌سازی و درج در تراکنش اتمیک.
 * پشتیبان احتیاطیِ دادهٔ فعلی توسط لایهٔ بالاتر (app) پیش از این فراخوانی ساخته می‌شود.
 */
export function restoreBackup(db: AnySyncDb, payload: BackupPayload): { counts: Record<string, number> } {
  const d = payload.data;
  return db.transaction((tx) => {
    // ترتیب حذف با رعایت FK: از جدول‌های وابسته به مستقل
    tx.delete(t.allocations).run();
    tx.delete(t.attachments).run();
    tx.delete(t.reminders).run();
    tx.delete(t.snoozedReminders).run();
    tx.delete(t.transactions).run();
    tx.delete(t.installments).run();
    tx.delete(t.accountInstallments).run();
    tx.delete(t.loans).run();
    tx.delete(t.accounts).run();
    tx.delete(t.persons).run();
    tx.delete(t.settings).run();

    const insertAll = (table: Parameters<typeof tx.insert>[0], rows: unknown[]) => {
      if (rows.length === 0) return;
      tx.insert(table).values(rows as never).run();
    };
    insertAll(t.persons, d.persons);
    insertAll(t.loans, d.loans);
    insertAll(t.installments, d.installments);
    insertAll(t.accounts, d.accounts);
    insertAll(t.accountInstallments, d.accountInstallments);
    insertAll(t.transactions, d.transactions);
    insertAll(t.allocations, d.allocations);
    insertAll(t.attachments, d.attachments);
    insertAll(t.reminders, d.reminders);
    insertAll(t.settings, d.settings);
    insertAll(t.snoozedReminders, d.snoozedReminders);

    return {
      counts: Object.fromEntries(
        Object.entries(d).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      ),
    };
  });
}

/** بازیابی تنظیم واحد نمایشی پس از restore */
export function getSettingAfterRestore(db: AnySyncDb, key: string): string | null {
  return db.select().from(t.settings).where(eq(t.settings.key, key)).get()?.value ?? null;
}
