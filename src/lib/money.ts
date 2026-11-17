/**
 * قواعد پول: همهٔ مبالغ به‌صورت عدد صحیح ریال ذخیره می‌شوند.
 * محاسبه با floating-point ممنوع است؛ ورودی کاربر در واحد نمایشی (پیش‌فرض تومان)
 * به ریال تبدیل و قبل از ذخیره اعتبارسنجی می‌شود.
 */
import { digitsToEnglish } from "./persian";

/** حداکثر مبلغ مجاز: یک میلیارد میلیارد ریال — در محدودهٔ امن Number است */
export const MAX_RIAL = 1_000_000_000_000_000; // 10^15

export type DisplayUnit = "toman" | "rial";

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/**
 * پارس متن مبلغ کاربر (با ارقام فارسی/عربی/انگلیسی و جداکننده‌ها)
 * خروجی: عدد صحیح ریال. اگر واحد تومان باشد ضریب ۱۰ اعمال می‌شود.
 * اعشار تا یک رقم در تومان پذیرفته می‌شود اگر حاصل ریال صحیح باشد.
 */
export function parseAmountToRial(raw: string, unit: DisplayUnit): number {
  const cleaned = digitsToEnglish(raw)
    .replace(/[,\s٬]/g, "")
    .replace(/[٫.]/g, ".");
  if (cleaned === "" || cleaned === ".") throw new MoneyError("مبلغ وارد نشده است");
  if (!/^\d+(\.\d)?$/.test(cleaned)) throw new MoneyError("مبلغ نامعتبر است");
  if (unit === "rial") {
    if (cleaned.includes(".")) throw new MoneyError("مبلغ ریالی باید صحیح باشد");
    return checkRange(Number(cleaned));
  }
  // تومان: ×۱۰
  const parts = cleaned.split(".");
  const intPart = parts[0] ?? "0";
  const dec = parts[1] ?? "";
  const rialStr = dec === "" ? `${intPart}0` : `${intPart}${dec}`;
  const rial = Number(rialStr);
  if (!Number.isInteger(rial)) throw new MoneyError("مبلغ نامعتبر است");
  return checkRange(rial);
}

function checkRange(rial: number): number {
  if (!Number.isFinite(rial) || !Number.isInteger(rial)) throw new MoneyError("مبلغ نامعتبر است");
  if (rial <= 0) throw new MoneyError("مبلغ باید بزرگ‌تر از صفر باشد");
  if (rial > MAX_RIAL) throw new MoneyError("مبلغ خارج از محدودهٔ مجاز است");
  return rial;
}

/** دریافت مبلغ پرداخت/تسویه: صفر و منفی و بیش از مانده رد می‌شود */
export function validatePayAmount(
  rial: number,
  remaining: number,
  opts: { allowMoreThanRemaining?: boolean } = {}
): void {
  if (!Number.isInteger(rial) || rial <= 0) throw new MoneyError("مبلغ باید بزرگ‌تر از صفر باشد");
  if (rial > MAX_RIAL) throw new MoneyError("مبلغ خارج از محدودهٔ مجاز است");
  if (!opts.allowMoreThanRemaining && rial > remaining)
    throw new MoneyError("مبلغ از ماندهٔ باقی‌مانده بیشتر است");
}

/**
 * نمایش ریال به تومان: اگر بخش‌پذیر بر ۱۰ نباشد بی‌صدا گرد نمی‌شود؛
 * یک رقم اعشار نمایش داده می‌شود.
 */
export function rialToTomanString(rial: number): string {
  if (!Number.isInteger(rial)) throw new MoneyError("مبلغ ریالی باید صحیح باشد");
  if (rial % 10 === 0) return String(rial / 10);
  const sign = rial < 0 ? "-" : "";
  const abs = Math.abs(rial);
  const int = Math.trunc(abs / 10);
  const dec = abs % 10;
  return `${sign}${int}.${dec}`;
}

/** متن قابل نمایش مبلغ در واحد انتخابی (بدون ارقام فارسی؛ گروه‌بندی خارجی انجام شود) */
export function amountText(rial: number, unit: DisplayUnit): string {
  if (unit === "rial") return String(rial);
  return rialToTomanString(rial);
}

/** ماندهٔ باقی‌مانده با جلوگیری از منفی‌شدن ناشی از خطا */
export function remaining(total: number, paid: number): number {
  if (!Number.isInteger(total) || !Number.isInteger(paid)) throw new MoneyError("مبلغ نامعتبر است");
  if (paid > total) throw new MoneyError("جمع پرداخت از مبلغ اصلی بیشتر است");
  return total - paid;
}

/** اعتبارسنجی محدودهٔ امن برای مبلغ اولیهٔ حساب‌ها */
export function validatePrincipalRial(rial: number): void {
  if (!Number.isInteger(rial) || rial <= 0) throw new MoneyError("مبلغ باید بزرگ‌تر از صفر باشد");
  if (rial > MAX_RIAL) throw new MoneyError("مبلغ خارج از محدودهٔ مجاز است");
}
