/**
 * موتور وام و اقساط — توابع خالص برای قابل تست‌بودن.
 *
 * قواعد تولید ماهانه:
 * - روز هدف از اولین سررسید استخراج می‌شود و در ماه‌های بعدی حفظ می‌شود.
 * - اگر روز هدف در ماه شمسی مقصد وجود نداشته باشد، آخرین روز آن ماه است.
 *   (مثلاً ۳۱ فروردین → ۳۱ اردیبهشت دارد ولی ۳۱ خرداد ندارد → ۳۱ خرداد می‌شود ۳۱؟ نه:
 *    خرداد ۳۱ روز دارد؛ تیر ۳۱ روز دارد؛ شهریور ۳۱؛ مهر ۳۰ → در مهر آخرین روز یعنی ۳۰)
 * - اسفند در سال کبیسه ۳۰ روز است و درست مدیریت می‌شود.
 */
import {
  gregorianToJalali,
  jalaliToISO,
  jalaliMonthLength,
  isOverdue,
  compareISO,
} from "./dates";

export interface ScheduleRow {
  seq: number;
  dueDate: string; // ISO date-only
  amount: number; // ریال
}

/**
 * تولید جدول اقساط ماهانه از اولین سررسید.
 * مبلغ قسط ثابت است (مبلغ متفاوت هر قسط پس از تولید با ویرایش انجام می‌شود).
 */
export function generateMonthlySchedule(
  firstDueISO: string,
  count: number,
  installmentAmount: number
): ScheduleRow[] {
  if (!Number.isInteger(count) || count <= 0) throw new Error("تعداد اقساط نامعتبر است");
  if (!Number.isInteger(installmentAmount) || installmentAmount <= 0)
    throw new Error("مبلغ قسط نامعتبر است");
  const { jy, jm, jd } = gregorianToJalali(firstDueISO);
  const rows: ScheduleRow[] = [];
  let y = jy;
  let m = jm;
  for (let i = 0; i < count; i++) {
    if (i > 0) {
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    const targetDay = i === 0 ? jd : jd; // روز هدف حفظ می‌شود
    const day = Math.min(targetDay, jalaliMonthLength(y, m));
    rows.push({ seq: i + 1, dueDate: jalaliToISO(y, m, day), amount: installmentAmount });
  }
  return rows;
}

/** جمع مبالغ جدول اقساط */
export function sumSchedule(rows: ScheduleRow[]): number {
  return rows.reduce((a, r) => a + r.amount, 0);
}

/**
 * اختلاف کل بازپرداخت اعلامی و جمع اقساط — پیش از ثبت باید رفع یا تأیید شود.
 * return null یعنی کل بازپرداخت تعیین نشده و اختلافی وجود ندارد.
 */
export function scheduleMismatch(totalRepay: number | null, rows: ScheduleRow[]): number | null {
  if (totalRepay == null) return null;
  return totalRepay - sumSchedule(rows);
}

export type InstallmentStatus = "unpaid" | "partial" | "settled";

/** وضعیت تسویه قسط بر اساس مانده */
export function installmentStatus(amount: number, allocated: number): InstallmentStatus {
  if (allocated <= 0) return "unpaid";
  if (allocated >= amount) return "settled";
  return "partial";
}

export interface InstallmentState {
  balance: number;
  allocated: number;
  status: InstallmentStatus;
  overdue: boolean;
}

/**
 * وضعیت کامل قسط:
 * - مانده قسط = مبلغ قسط − پرداخت‌های تخصیص‌یافته
 * - عقب‌افتادگی مستقل از وضعیت تسویه است: ماندهٔ مثبت و سررسید قبل از امروز
 */
export function installmentState(
  amount: number,
  allocated: number,
  dueDate: string,
  todayISO: string
): InstallmentState {
  if (allocated > amount) throw new Error("پرداخت تخصیص‌یافته از مبلغ قسط بیشتر است");
  const balance = amount - allocated;
  return {
    balance,
    allocated,
    status: installmentStatus(amount, allocated),
    overdue: balance > 0 && isOverdue(dueDate, todayISO),
  };
}

/** ماندهٔ وام = مجموع ماندهٔ اقساط */
export function loanBalance(rows: { amount: number; allocated: number }[]): number {
  return rows.reduce((acc, r) => {
    if (r.allocated > r.amount) throw new Error("پرداخت تخصیص‌یافته از مبلغ قسط بیشتر است");
    return acc + (r.amount - r.allocated);
  }, 0);
}

/** درصد پیشرفت تسویه وام (۰ تا ۱۰۰) */
export function loanProgress(rows: { amount: number; allocated: number }[]): number {
  const total = rows.reduce((a, r) => a + r.amount, 0);
  if (total <= 0) return 0;
  const paid = rows.reduce((a, r) => a + r.allocated, 0);
  const pct = Math.floor((paid / total) * 100);
  return Math.max(0, Math.min(100, pct));
}

/** نزدیک‌ترین قسط پرداخت‌نشده بعد از یک تاریخ */
export function nextOpenInstallment(
  rows: { seq: number; dueDate: string; amount: number; allocated: number }[],
  todayISO: string
): { seq: number; dueDate: string; balance: number } | null {
  let best: { seq: number; dueDate: string; balance: number } | null = null;
  for (const r of rows) {
    const balance = r.amount - r.allocated;
    if (balance <= 0) continue;
    if (compareISO(r.dueDate, todayISO) < 0) continue;
    if (!best || compareISO(r.dueDate, best.dueDate) < 0) best = { seq: r.seq, dueDate: r.dueDate, balance };
  }
  return best;
}
