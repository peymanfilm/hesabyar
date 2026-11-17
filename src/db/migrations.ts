/**
 * migrationهای نسخه‌بندی‌شدهٔ پایگاه داده.
 * هر migration فقط جداول خودش را می‌سازد؛ دادهٔ نسخهٔ قبلی حفظ می‌شود.
 * نسخه در PRAGMA user_version نگهداری می‌شود.
 */

export interface Migration {
  version: number;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        bank TEXT,
        principal INTEGER NOT NULL,
        total_repay INTEGER,
        installment_count INTEGER NOT NULL,
        installment_amount INTEGER NOT NULL,
        first_due_date TEXT NOT NULL,
        schedule_mode TEXT NOT NULL DEFAULT 'monthly',
        contract_no TEXT,
        note TEXT,
        reminder_enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        seq INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        amount INTEGER NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_installments_loan ON installments(loan_id);`,
      `CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER REFERENCES persons(id),
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        initial_amount INTEGER NOT NULL,
        created_date TEXT NOT NULL,
        due_date TEXT,
        settle_mode TEXT NOT NULL DEFAULT 'irregular',
        note TEXT,
        reminder_enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS account_installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        seq INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        amount INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        amount INTEGER NOT NULL,
        date TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'cash',
        note TEXT,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        amount INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_alloc_txn ON allocations(transaction_id);`,
      `CREATE INDEX IF NOT EXISTS idx_alloc_target ON allocations(target_type, target_id);`,
      `CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        uri TEXT NOT NULL,
        file_name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        days_before INTEGER NOT NULL,
        time TEXT NOT NULL DEFAULT '09:00',
        enabled INTEGER NOT NULL DEFAULT 1,
        notif_id TEXT,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS snoozed_reminders (
        target_key TEXT PRIMARY KEY,
        until_iso TEXT NOT NULL,
        notif_id TEXT
      );`,
    ],
  },
];

export const CURRENT_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;
