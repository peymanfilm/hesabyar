/**
 * منطق طلب و بدهی — توابع خالص.
 * تعریف‌ها (قاعدهٔ قطعی):
 * - مانده طلب = مبلغ طلب − دریافت‌های معتبر
 * - مانده بدهی = مبلغ بدهی − پرداخت‌های معتبر
 * - طلب و بدهی خودکار تهاتر نمی‌شوند.
 * - حساب بدون سررسید عقب‌افتاده محسوب نمی‌شود.
 * - عقب‌افتادگی مستقل از وضعیت تسویه است.
 */
import { isOverdue } from "./dates";

export type AccountKind = "receivable" | "debt";
export type SettleState = "unpaid" | "partial" | "settled";

export interface AccountState {
  balance: number;
  paid: number;
  state: SettleState;
  overdue: boolean;
}

/** محاسبهٔ وضعیت حساب: دریافت برای طلب، پرداخت برای بدهی معتبر است */
export function accountState(
  kind: AccountKind,
  initialAmount: number,
  txnAmounts: number[],
  dueDate: string | null,
  todayISO: string
): AccountState {
  if (!Number.isInteger(initialAmount) || initialAmount < 0)
    throw new Error("مبلغ اولیه نامعتبر است");
  const paid = txnAmounts.reduce((a, v) => {
    if (!Number.isInteger(v) || v < 0) throw new Error("مبلغ تراکنش نامعتبر است");
    return a + v;
  }, 0);
  if (paid > initialAmount) throw new Error("جمع تراکنش‌ها از مبلغ اولیه بیشتر است");
  const balance = initialAmount - paid;
  const state: SettleState = paid <= 0 ? "unpaid" : balance === 0 ? "settled" : "partial";
  return {
    balance,
    paid,
    state,
    overdue: balance > 0 && dueDate !== null && isOverdue(dueDate, todayISO),
  };
}

/** مجموع طلب‌های من (ماندهٔ حساب‌های receivable) */
export function totalReceivable(balances: number[]): number {
  return balances.reduce((a, b) => a + b, 0);
}

/** مجموع بدهی‌های من (ماندهٔ حساب‌های debt) */
export function totalDebt(balances: number[]): number {
  return balances.reduce((a, b) => a + b, 0);
}

/**
 * خالص حساب شخص: جملهٔ واضح فارسی.
 * تهاتر انجام نمی‌شود؛ فقط جملهٔ توصیفی ساخته می‌شود.
 */
export function personNetSummary(
  receivableBalance: number,
  debtBalance: number
): { sentence: string; net: number } {
  const net = receivableBalance - debtBalance;
  if (receivableBalance === 0 && debtBalance === 0)
    return { sentence: "حساب بازی نکرده‌اید", net: 0 };
  if (debtBalance === 0 && receivableBalance > 0)
    return { sentence: `${receivableBalance.toLocaleString("en-US")} ریال طلب دارید`, net };
  if (receivableBalance === 0 && debtBalance > 0)
    return { sentence: `${debtBalance.toLocaleString("en-US")} ریال بدهکارید`, net };
  if (net > 0) return { sentence: `در کل ${net.toLocaleString("en-US")} ریال طلب دارید`, net };
  if (net < 0) return { sentence: `در کل ${Math.abs(net).toLocaleString("en-US")} ریال بدهکارید`, net };
  return { sentence: "حساب‌ها خالص بازی برابرند", net: 0 };
}

/**
 * تخصیص یک پرداخت جزئی بین اقساط باز به ترتیب قدیمی‌ترین سررسید.
 * مبلغ بیشتر از ماندهٔ کل رد می‌شود. خروجی: مبلغ تخصیص به هر قسط.
 */
export function allocatePayment(
  payment: number,
  openInstallments: { id: number; amount: number; allocated: number; dueDate: string }[]
): { id: number; amount: number }[] {
  if (!Number.isInteger(payment) || payment <= 0) throw new Error("مبلغ پرداخت نامعتبر است");
  const remainingOf = (it: { amount: number; allocated: number }) => it.amount - it.allocated;
  const totalRemaining = openInstallments.reduce((a, it) => a + remainingOf(it), 0);
  if (payment > totalRemaining) throw new Error("مبلغ پرداخت از ماندهٔ کل بیشتر است");
  const sorted = [...openInstallments].sort((a, b) =>
    a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.id - b.id
  );
  let left = payment;
  const out: { id: number; amount: number }[] = [];
  for (const it of sorted) {
    if (left <= 0) break;
    const cap = remainingOf(it);
    const alloc = Math.min(cap, left);
    if (alloc > 0) out.push({ id: it.id, amount: alloc });
    left -= alloc;
  }
  return out;
}
