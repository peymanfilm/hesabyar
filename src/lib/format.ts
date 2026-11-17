/**
 * قالب‌بندی نمایشی مبلغ — واحد، ارقام فارسی، جداکنندهٔ سه‌رقمی.
 */
import { amountText, type DisplayUnit } from "./money";
import { digitsToPersian, groupPersian } from "./persian";

export function formatMoney(rial: number, unit: DisplayUnit): string {
  return digitsToPersian(groupPersian(amountText(rial, unit)));
}

export function unitLabel(unit: DisplayUnit): string {
  return unit === "toman" ? "تومان" : "ریال";
}
