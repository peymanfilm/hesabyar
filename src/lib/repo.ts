/**
 * لایهٔ دسترسی به داده — همهٔ عملیات چندمرحله‌ای در تراکنش اتمیک اجرا می‌شوند.
 * تایپ db عمومی است تا هم با expo-sqlite (اپ) و هم با better-sqlite3 (تست) کار کند.
 *
 * قواعد کلیدی پیاده‌سازی‌شده:
 * - ثبت تراکنش + تخصیص در یک تراکنش اتمیک
 * - پرداخت بیش از مانده رد می‌شود
 * - مبلغ اولیه نمی‌تواند کمتر از جمع تسویه‌شده شود
 * - حذف شخص دارای سوابق مالی ممنوع است
 * - حذف قسط دارای پرداخت ممنوع است
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as t from "@/db/schema";
import { accountState, type AccountKind } from "@/lib/balances";
import { installmentState, loanBalance, loanProgress } from "@/lib/installments";
import { validatePayAmount, validatePrincipalRial } from "@/lib/money";
import type { TransactionForm } from "@/lib/validation";
import { compareISO, nowISODateTime } from "@/lib/dates";

 
// تایپ عمومی پایگاه داده — سازگار با درایور expo-sqlite و sql-js (تست)
export type SyncDb = BaseSQLiteDatabase<"sync", any, any, any>;

/**
 * دریافت شناسهٔ آخرین رکورد درج‌شده با همان اتصال.
 * درایور sql-js و expo هر دو از last_insert_rowid() پشتیبانی می‌کنند
 * (خروجی .run() بین درایورها متفاوت است).
 */
function lastInsertId(db: SyncDb): number {
  const rows = db.all<{ id: number }>(sql`SELECT last_insert_rowid() AS id`);
  const row = rows[0];
  if (!row || !Number.isInteger(Number(row.id))) throw new Error("دریافت شناسهٔ رکورد ناموفق بود");
  return Number(row.id);
}

// ---------- اشخاص ----------

export interface PersonInput {
  name: string;
  phone?: string | null;
  note?: string | null;
}

export function createPerson(db: SyncDb, input: PersonInput, now: string = nowISODateTime()): number {
  db.insert(t.persons)
    .values({ name: input.name, phone: input.phone ?? null, note: input.note ?? null, createdAt: now })
    .run();
  return lastInsertId(db);
}

export function updatePerson(db: SyncDb, id: number, input: PersonInput): void {
  db.update(t.persons)
    .set({ name: input.name, phone: input.phone ?? null, note: input.note ?? null })
    .where(eq(t.persons.id, id))
    .run();
}

export function canDeletePerson(db: SyncDb, id: number): { ok: boolean; reason?: string } {
  const accs = db.select().from(t.accounts).where(eq(t.accounts.personId, id)).all();
  if (accs.length === 0) return { ok: true };
  const ids = accs.map((a) => a.id);
  const open = ids.filter((aid) => {
    const acc = accs.find((x) => x.id === aid)!;
    const amounts = accountTxnAmounts(db, aid, acc.kind as AccountKind);
    return amounts.length > 0;
  });
  if (open.length > 0)
    return { ok: false, reason: "شخص دارای حساب‌های مالی با تراکنش است؛ ابتدا حساب‌ها را تعیین تکلیف کنید" };
  return { ok: true };
}

export function deletePerson(db: SyncDb, id: number): void {
  const check = canDeletePerson(db, id);
  if (!check.ok) throw new Error(check.reason);
  db.delete(t.persons).where(eq(t.persons.id, id)).run();
}

// ---------- حساب‌های طلب/بدهی ----------

export interface AccountInput {
  kind: "receivable" | "debt";
  title: string;
  personId: number | null;
  initialAmount: number;
  createdDate: string;
  dueDate: string | null;
  settleMode: "lump" | "installment" | "irregular";
  note?: string | null;
  reminderEnabled?: number;
}

export function createAccount(db: SyncDb, input: AccountInput, now: string = nowISODateTime()): number {
  validatePrincipalRial(input.initialAmount);
  db
    .insert(t.accounts)
    .values({
      personId: input.personId,
      kind: input.kind,
      title: input.title,
      initialAmount: input.initialAmount,
      createdDate: input.createdDate,
      dueDate: input.dueDate,
      settleMode: input.settleMode,
      note: input.note ?? null,
      reminderEnabled: input.reminderEnabled ?? 1,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return lastInsertId(db);
}

/** جمع تراکنش‌های معتبر یک حساب (دریافت برای طلب / پرداخت برای بدهی) */
export function accountTxnAmounts(db: SyncDb, accountId: number, kind: AccountKind): number[] {
  const target = "account";
  const allocs = db
    .select()
    .from(t.allocations)
    .where(and(eq(t.allocations.targetType, target), eq(t.allocations.targetId, accountId)))
    .all();
  if (allocs.length === 0) return [];
  const txnIds = allocs.map((a) => a.transactionId);
  const txns = db.select().from(t.transactions).where(inArray(t.transactions.id, txnIds)).all();
  const kindNeeded = kind === "receivable" ? "receive" : "pay";
  const valid = new Map(txns.filter((x) => x.kind === kindNeeded).map((x) => [x.id, x]));
  return allocs
    .filter((a) => valid.has(a.transactionId))
    .map((a) => a.amount);
}

export function getAccountState(
  db: SyncDb,
  accountId: number,
  todayISO: string
): ReturnType<typeof accountState> {
  const acc = db.select().from(t.accounts).where(eq(t.accounts.id, accountId)).get();
  if (!acc) throw new Error("حساب یافت نشد");
  const amounts = accountTxnAmounts(db, accountId, acc.kind as AccountKind);
  return accountState(acc.kind as AccountKind, acc.initialAmount, amounts, acc.dueDate, todayISO);
}

export function updateAccount(
  db: SyncDb,
  id: number,
  input: Partial<AccountInput>,
  now: string = nowISODateTime()
): void {
  const acc = db.select().from(t.accounts).where(eq(t.accounts.id, id)).get();
  if (!acc) throw new Error("حساب یافت نشد");
  const newInitial = input.initialAmount ?? acc.initialAmount;
  if (newInitial !== acc.initialAmount) {
    validatePrincipalRial(newInitial);
    const kind = acc.kind as AccountKind;
    const paid = accountTxnAmounts(db, id, kind).reduce((a, v) => a + v, 0);
    if (newInitial < paid)
      throw new Error("مبلغ اولیه نمی‌تواند کمتر از مبلغ تسویه‌شده باشد");
  }
  db.update(t.accounts)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.personId !== undefined ? { personId: input.personId } : {}),
      ...(input.initialAmount !== undefined ? { initialAmount: input.initialAmount } : {}),
      ...(input.createdDate !== undefined ? { createdDate: input.createdDate } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.settleMode !== undefined ? { settleMode: input.settleMode } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(input.reminderEnabled !== undefined ? { reminderEnabled: input.reminderEnabled } : {}),
      updatedAt: now,
    })
    .where(eq(t.accounts.id, id))
    .run();
}

export function deleteAccount(db: SyncDb, id: number): void {
  const allocs = db
    .select()
    .from(t.allocations)
    .where(and(eq(t.allocations.targetType, "account"), eq(t.allocations.targetId, id)))
    .all();
  if (allocs.length > 0)
    throw new Error("حساب دارای تراکنش است؛ ابتدا تراکنش‌ها را حذف یا تسویه را تعیین تکلیف کنید");
  db.delete(t.accounts).where(eq(t.accounts.id, id)).run();
}

// ---------- تراکنش‌ها و تخصیص ----------

export interface AllocationInput {
  targetType: "account" | "loan_installment" | "account_installment";
  targetId: number;
  amount: number;
}

/**
 * ثبت تراکنش و تخصیص به‌صورت اتمیک.
 * مجموع تخصیص‌ها باید دقیقاً برابر مبلغ تراکنش باشد.
 * جهت تراکنش با نوع هدف سازگار باشد (دریافت فقط برای حساب طلب، پرداخت برای بدهی/قسط).
 */
export function addTransaction(
  db: SyncDb,
  form: TransactionForm,
  targets: AllocationInput[],
  opts: { date: string; recordedAt?: string }
): number {
  if (targets.length === 0) throw new Error("حداقل یک تخصیص لازم است");
  const allocSum = targets.reduce((a, x) => {
    if (!Number.isInteger(x.amount) || x.amount <= 0) throw new Error("مبلغ تخصیص نامعتبر است");
    return a + x.amount;
  }, 0);
  if (allocSum !== form.amount)
    throw new Error("مجموع تخصیص‌ها باید دقیقاً برابر مبلغ تراکنش باشد");
  const recordedAt = opts.recordedAt ?? nowISODateTime();
  const date = opts.date;

  return db.transaction((tx) => {
    for (const target of targets) {
      if (target.targetType === "account") {
        const acc = tx.select().from(t.accounts).where(eq(t.accounts.id, target.targetId)).get();
        if (!acc) throw new Error("حساب یافت نشد");
        const kind = acc.kind as AccountKind;
        const needKind = kind === "receivable" ? "receive" : "pay";
        if (form.kind !== needKind)
          throw new Error(
            kind === "receivable" ? "برای طلب فقط «دریافت» مجاز است" : "برای بدهی فقط «پرداخت» مجاز است"
          );
        const amounts = accountTxnAmounts(tx as SyncDb, acc.id, kind);
        const remaining = acc.initialAmount - amounts.reduce((a, v) => a + v, 0);
        validatePayAmount(target.amount, remaining);
      } else {
        const inst =
          target.targetType === "loan_installment"
            ? tx.select().from(t.installments).where(eq(t.installments.id, target.targetId)).get()
            : tx.select().from(t.accountInstallments).where(eq(t.accountInstallments.id, target.targetId)).get();
        if (!inst) throw new Error("قسط یافت نشد");
        if (form.kind !== "pay")
          throw new Error("برای قسط فقط «پرداخت» مجاز است");
        const existing = tx
          .select()
          .from(t.allocations)
          .where(and(eq(t.allocations.targetType, target.targetType), eq(t.allocations.targetId, target.targetId)))
          .all();
        const allocated = existing.reduce((a, v) => a + v.amount, 0);
        validatePayAmount(target.amount, inst.amount - allocated);
      }
    }

    tx.insert(t.transactions)
      .values({
        kind: form.kind,
        amount: form.amount,
        date,
        recordedAt,
        method: form.method,
        note: form.note ?? null,
        createdAt: recordedAt,
      })
      .run();
    const txnId = lastInsertId(tx as SyncDb);
    for (const target of targets) {
      tx.insert(t.allocations)
        .values({ transactionId: txnId, targetType: target.targetType, targetId: target.targetId, amount: target.amount })
        .run();
    }
    return txnId;
  });
}

export function updateTransactionAmount(db: SyncDb, txnId: number, newAmount: number): void {
  const txn = db.select().from(t.transactions).where(eq(t.transactions.id, txnId)).get();
  if (!txn) throw new Error("تراکنش یافت نشد");
  const allocs = db.select().from(t.allocations).where(eq(t.allocations.transactionId, txnId)).all();
  if (allocs.length !== 1)
    throw new Error("ویرایش مقدار برای تخصیص چندگانه پشتیبانی نمی‌شود");
  const alloc = allocs[0]!;
  db.transaction((tx) => {
    if (alloc.targetType === "account") {
      const acc = tx.select().from(t.accounts).where(eq(t.accounts.id, alloc.targetId)).get();
      if (!acc) throw new Error("حساب یافت نشد");
      const kind = acc.kind as AccountKind;
      const others = accountTxnAmounts(tx as SyncDb, acc.id, kind);
      const thisTxnAlloc = alloc.amount;
      const rest = others.reduce((a, v) => a + v, 0) - thisTxnAlloc;
      const remaining = acc.initialAmount - rest;
      validatePayAmount(newAmount, remaining);
    } else {
      const table = alloc.targetType === "loan_installment" ? t.installments : t.accountInstallments;
      const inst = tx.select().from(table).where(eq(table.id, alloc.targetId)).get();
      if (!inst) throw new Error("قسط یافت نشد");
      const existing = tx
        .select()
        .from(t.allocations)
        .where(and(eq(t.allocations.targetType, alloc.targetType), eq(t.allocations.targetId, alloc.targetId)))
        .all();
      const allocated = existing.reduce((a, v) => a + v.amount, 0);
      validatePayAmount(newAmount, inst.amount - allocated + alloc.amount);
    }
    tx.update(t.transactions).set({ amount: newAmount }).where(eq(t.transactions.id, txnId)).run();
    tx.update(t.allocations).set({ amount: newAmount }).where(eq(t.allocations.id, alloc.id)).run();
  });
}

export function deleteTransaction(db: SyncDb, txnId: number): void {
  db.delete(t.transactions).where(eq(t.transactions.id, txnId)).run(); // allocation با cascade حذف می‌شود
}

export interface TxnWithTarget {
  txn: t.Transaction;
  alloc: t.Allocation;
}

export function transactionsOfAccount(db: SyncDb, accountId: number): TxnWithTarget[] {
  const allocs = db
    .select()
    .from(t.allocations)
    .where(and(eq(t.allocations.targetType, "account"), eq(t.allocations.targetId, accountId)))
    .all();
  if (allocs.length === 0) return [];
  const txns = db
    .select()
    .from(t.transactions)
    .where(inArray(t.transactions.id, allocs.map((a) => a.transactionId)))
    .all();
  const byId = new Map(txns.map((x) => [x.id, x]));
  return allocs
    .map((a) => ({ txn: byId.get(a.transactionId)!, alloc: a }))
    .filter((x) => x.txn != null);
}

// ---------- وام‌ها ----------

export interface LoanInput {
  title: string;
  bank?: string | null;
  principal: number;
  totalRepay: number | null;
  installmentCount: number;
  installmentAmount: number;
  firstDueDate: string;
  scheduleMode: "monthly" | "manual";
  contractNo?: string | null;
  note?: string | null;
  reminderEnabled?: number;
}

export function createLoan(
  db: SyncDb,
  input: LoanInput,
  rows: { seq: number; dueDate: string; amount: number }[],
  now: string = nowISODateTime()
): number {
  // اختلاف جمع اقساط و کل بازپرداخت پیش از ثبت باید رفع شده باشد
  if (input.totalRepay != null) {
    const sum = rows.reduce((a, r) => a + r.amount, 0);
    if (sum !== input.totalRepay)
      throw new Error("جمع اقساط با کل بازپرداخت برابر نیست؛ پیش از ثبت اصلاح کنید");
  }
  const count = rows.length;
  return db.transaction((tx) => {
    tx
      .insert(t.loans)
      .values({
        title: input.title,
        bank: input.bank ?? null,
        principal: input.principal,
        totalRepay: input.totalRepay,
        installmentCount: count,
        installmentAmount: input.installmentAmount,
        firstDueDate: input.firstDueDate,
        scheduleMode: input.scheduleMode,
        contractNo: input.contractNo ?? null,
        note: input.note ?? null,
        reminderEnabled: input.reminderEnabled ?? 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const loanId = lastInsertId(tx as SyncDb);
    for (const r of rows) {
      tx.insert(t.installments)
        .values({ loanId, seq: r.seq, dueDate: r.dueDate, amount: r.amount, createdAt: now })
        .run();
    }
    return loanId;
  });
}

export function updateInstallment(
  db: SyncDb,
  instId: number,
  patch: { amount?: number; dueDate?: string; note?: string | null },
  now: string = nowISODateTime()
): void {
  const inst = db.select().from(t.installments).where(eq(t.installments.id, instId)).get();
  if (!inst) throw new Error("قسط یافت نشد");
  if (patch.amount !== undefined && patch.amount !== inst.amount) {
    const allocated = db
      .select()
      .from(t.allocations)
      .where(and(eq(t.allocations.targetType, "loan_installment"), eq(t.allocations.targetId, instId)))
      .all()
      .reduce((a, v) => a + v.amount, 0);
    if (patch.amount < allocated)
      throw new Error("مبلغ قسط نمی‌تواند کمتر از پرداخت‌های ثبت‌شده باشد");
  }
  db.update(t.installments)
    .set({
      ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
      ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
    })
    .where(eq(t.installments.id, instId))
    .run();
}

export function deleteInstallment(db: SyncDb, instId: number): void {
  const hasAlloc =
    db
      .select()
      .from(t.allocations)
      .where(and(eq(t.allocations.targetType, "loan_installment"), eq(t.allocations.targetId, instId)))
      .all().length > 0;
  if (hasAlloc) throw new Error("قسط دارای پرداخت است و حذف نمی‌شود");
  db.delete(t.installments).where(eq(t.installments.id, instId)).run();
}

export function addManualInstallment(
  db: SyncDb,
  loanId: number,
  row: { dueDate: string; amount: number },
  now: string = nowISODateTime()
): number {
  const maxSeq =
    db
      .select({ s: sql<number>`COALESCE(MAX(${t.installments.seq}), 0)` })
      .from(t.installments)
      .where(eq(t.installments.loanId, loanId))
      .get()?.s ?? 0;
  db
    .insert(t.installments)
    .values({ loanId, seq: Number(maxSeq) + 1, dueDate: row.dueDate, amount: row.amount, createdAt: now })
    .run();
  return lastInsertId(db);
}

export interface InstallmentWithState extends t.Installment {
  allocated: number;
  balance: number;
  status: string;
  overdue: boolean;
}

export function loanInstallmentsWithState(
  db: SyncDb,
  loanId: number,
  todayISO: string
): { loan: t.Loan; rows: InstallmentWithState[]; balance: number; progress: number } {
  const loan = db.select().from(t.loans).where(eq(t.loans.id, loanId)).get();
  if (!loan) throw new Error("وام یافت نشد");
  const rows = db
    .select()
    .from(t.installments)
    .where(eq(t.installments.loanId, loanId))
    .orderBy(asc(t.installments.seq))
    .all();
  const allocAll = db.select().from(t.allocations).all();
  const allocByInst = new Map<number, number>();
  for (const a of allocAll) {
    if (a.targetType !== "loan_installment") continue;
    allocByInst.set(a.targetId, (allocByInst.get(a.targetId) ?? 0) + a.amount);
  }
  const withState: InstallmentWithState[] = rows.map((r) => {
    const allocated = allocByInst.get(r.id) ?? 0;
    const st = installmentState(r.amount, allocated, r.dueDate, todayISO);
    return { ...r, allocated, balance: st.balance, status: st.status, overdue: st.overdue };
  });
  return {
    loan,
    rows: withState,
    balance: loanBalance(withState),
    progress: loanProgress(withState),
  };
}

/** اقساط باز یک وام به ترتیب سررسید — برای تخصیص پرداخت جزئی */
export function openInstallmentsOfLoan(db: SyncDb, loanId: number) {
  return db
    .select()
    .from(t.installments)
    .where(eq(t.installments.loanId, loanId))
    .orderBy(asc(t.installments.dueDate))
    .all();
}

// ---------- گزارش ----------

export interface MonthlyReportRow {
  personName: string | null;
  bank: string | null;
  kind: string;
  amount: number;
}

/**
 * گزارش ماهانه شمسی: تراکنش‌های بازه ماه با تخصیص هدفشان.
 * هر تراکنش فقط یک بار شمرده می‌شود (مبلغ تراکنش، نه جمع تخصیص‌ها).
 */
export function monthlyReport(db: SyncDb, fromISO: string, toISO: string): {
  receive: number;
  pay: number;
  rows: MonthlyReportRow[];
} {
  const txns = db
    .select()
    .from(t.transactions)
    .all()
    .filter((x) => compareISO(x.date, fromISO) >= 0 && compareISO(x.date, toISO) <= 0);
  const allocs = db.select().from(t.allocations).all();
  const allocByTxn = new Map<number, t.Allocation[]>();
  for (const a of allocs) {
    const list = allocByTxn.get(a.transactionId) ?? [];
    list.push(a);
    allocByTxn.set(a.transactionId, list);
  }
  const accs = db.select().from(t.accounts).all();
  const loans = db.select().from(t.loans).all();
  const persons = db.select().from(t.persons).all();
  const accById = new Map(accs.map((a) => [a.id, a]));
  const loanById = new Map(loans.map((l) => [l.id, l]));
  const personById = new Map(persons.map((p) => [p.id, p]));

  let receive = 0;
  let pay = 0;
  const rows: MonthlyReportRow[] = [];
  for (const txn of txns) {
    if (txn.kind === "receive") receive += txn.amount;
    else pay += txn.amount;
    const targets = allocByTxn.get(txn.id) ?? [];
    let personName: string | null = null;
    let bank: string | null = null;
    for (const a of targets) {
      if (a.targetType === "account") {
        const acc = accById.get(a.targetId);
        if (acc?.personId != null) personName = personById.get(acc.personId)?.name ?? null;
      } else if (a.targetType === "loan_installment") {
        const inst = db.select().from(t.installments).where(eq(t.installments.id, a.targetId)).get();
        if (inst) bank = loanById.get(inst.loanId)?.bank ?? null;
      } else if (a.targetType === "account_installment") {
        const inst = db.select().from(t.accountInstallments).where(eq(t.accountInstallments.id, a.targetId)).get();
        if (inst) {
          const acc = accById.get(inst.accountId);
          if (acc?.personId != null) personName = personById.get(acc.personId)?.name ?? null;
        }
      }
    }
    rows.push({ personName, bank, kind: txn.kind, amount: txn.amount });
  }
  return { receive, pay, rows };
}

// ---------- تنظیمات ----------

export function getSetting(db: SyncDb, key: string): string | null {
  const row = db.select().from(t.settings).where(eq(t.settings.key, key)).get();
  return row?.value ?? null;
}

export function setSetting(db: SyncDb, key: string, value: string): void {
  db.insert(t.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: t.settings.key, set: { value } })
    .run();
}
