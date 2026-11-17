/**
 * مدل دادهٔ حساب‌یار — همهٔ مبالغ عدد صحیح ریال هستند (SQLite INTEGER).
 * روابط با foreign key و فعال‌بودن PRAGMA foreign_keys تضمین می‌شود.
 */
import { sqliteTable, text, integer, } from "drizzle-orm/sqlite-core";

export const persons = sqliteTable("persons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  note: text("note"),
  createdAt: text("created_at").notNull(), // ISO datetime
});

/** وام و اقساط بانکی */
export const loans = sqliteTable("loans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  bank: text("bank"),
  /** اصل وام (ریال) */
  principal: integer("principal").notNull(),
  /** کل بازپرداخت اختیاری (ریال) */
  totalRepay: integer("total_repay"),
  installmentCount: integer("installment_count").notNull(),
  installmentAmount: integer("installment_amount").notNull(),
  /** اولین سررسید (date-only ISO) */
  firstDueDate: text("first_due_date").notNull(),
  /** 'monthly' برنامهٔ ماهانه | 'manual' برنامهٔ دستی */
  scheduleMode: text("schedule_mode").notNull().default("monthly"),
  contractNo: text("contract_no"),
  note: text("note"),
  reminderEnabled: integer("reminder_enabled").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** قسط */
export const installments = sqliteTable("installments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loanId: integer("loan_id")
    .notNull()
    .references(() => loans.id, { onDelete: "cascade" }),
  seq: integer("seq").notNull(),
  /** سررسید date-only */
  dueDate: text("due_date").notNull(),
  /** مبلغ قسط (ریال) — قابل ویرایش برای اقساط مبلغ متفاوت */
  amount: integer("amount").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull(),
});

/**
 * حساب طلب/بدهی از اشخاص
 * kind: 'receivable' طلب من | 'debt' بدهی من
 */
export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personId: integer("person_id").references(() => persons.id),
  kind: text("kind").notNull(), // receivable | debt
  title: text("title").notNull(),
  /** مبلغ اولیه (ریال) */
  initialAmount: integer("initial_amount").notNull(),
  /** تاریخ ایجاد (date-only) */
  createdDate: text("created_date").notNull(),
  /** سررسید اختیار (date-only) */
  dueDate: text("due_date"),
  /** 'lump' یک‌جا | 'installment' قسطی | 'irregular' نامنظم */
  settleMode: text("settle_mode").notNull().default("irregular"),
  note: text("note"),
  reminderEnabled: integer("reminder_enabled").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** برنامهٔ اقسط حساب‌های قسطی (تولید مانند وام) */
export const accountInstallments = sqliteTable("account_installments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  seq: integer("seq").notNull(),
  dueDate: text("due_date").notNull(),
  amount: integer("amount").notNull(),
  createdAt: text("created_at").notNull(),
});

/**
 * تراکنش مالی
 * kind: 'pay' پرداخت من | 'receive' دریافت من
 * method: cash | card | transfer | other
 * هدف تراکنش با تخصیص مشخص می‌شود (یک یا چند allocation)
 */
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  /** مبلغ کل تراکنش (ریال) */
  amount: integer("amount").notNull(),
  /** تاریخ عملیات (date-only) */
  date: text("date").notNull(),
  /** زمان ثبت واقعی (ISO datetime، جدای از date سررسید) */
  recordedAt: text("recorded_at").notNull(),
  method: text("method").notNull().default("cash"),
  note: text("note"),
  createdAt: text("created_at").notNull(),
});

/**
 * تخصیص تراکنش به هدف مالی (قسط وام، حساب طلب/بدهی یا قسط حساب)
 * ثبت تراکنش + تخصیص اتمیک است.
 */
export const allocations = sqliteTable("allocations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(), // loan_installment | account | account_installment
  targetId: integer("target_id").notNull(),
  /** بخشی از مبلغ تراکنش که به این هدف اختصاص یافته (ریال) */
  amount: integer("amount").notNull(),
});

/** پیوست رسید — در فضای پایدار اپ (documentDirectory) ذخیره می‌شود */
export const attachments = sqliteTable("attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  /** 'image' | 'pdf' */
  kind: text("kind").notNull(),
  /** مسیر پایدار در documentDirectory/receipts */
  uri: text("uri").notNull(),
  fileName: text("file_name").notNull(),
  createdAt: text("created_at").notNull(),
});

/** یادآوری هر سررسید */
export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetType: text("target_type").notNull(), // loan_installment | account | account_installment
  targetId: integer("target_id").notNull(),
  /** روزهای قبل از سررسید: 0 (همان روز)، 1، 3، 7 */
  daysBefore: integer("days_before").notNull(),
  /** ساعت یادآوری 'HH:MM' */
  time: text("time").notNull().default("09:00"),
  enabled: integer("enabled").notNull().default(1),
  /** شناسه اعلان زمان‌بندی‌شده برای لغو دقیق */
  notifId: text("notif_id"),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** پیگیری تعویق یادآوری‌ها */
export const snoozedReminders = sqliteTable("snoozed_reminders", {
  targetKey: text("target_key").primaryKey(), // `${targetType}-${targetId}-${dueDate}`
  untilISO: text("until_iso").notNull(),
  notifId: text("notif_id"),
});

export type Person = typeof persons.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type Installment = typeof installments.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type AccountInstallment = typeof accountInstallments.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Allocation = typeof allocations.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type SnoozedReminder = typeof snoozedReminders.$inferSelect;
