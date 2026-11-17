/**
 * تبدیل ارقام فارسی/عربی/انگلیسی و قالب‌بندی اعداد فارسی
 */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** تبدیل ارقام فارسی و عربی به انگلیسی */
export function digitsToEnglish(input: string): string {
  let out = "";
  for (const ch of input) {
    const p = PERSIAN_DIGITS.indexOf(ch);
    if (p >= 0) {
      out += String(p);
      continue;
    }
    const a = ARABIC_DIGITS.indexOf(ch);
    if (a >= 0) {
      out += String(a);
      continue;
    }
    out += ch;
  }
  return out;
}

/** تبدیل ارقام انگلیسی به فارسی برای نمایش */
export function digitsToPersian(input: string): string {
  let out = "";
  for (const ch of input) {
    if (ch >= "0" && ch <= "9") out += PERSIAN_DIGITS[Number(ch)];
    else out += ch;
  }
  return out;
}

/** جداسازی سه‌رقمی با «,» سپس تبدیل به فارسی برای نمایش */
export function groupPersian(input: string): string {
  const parts = input.split(".");
  const intPart = parts[0] ?? "";
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const rest = parts.slice(1).join(".");
  const withDot = parts.length > 1 ? `${grouped}.${rest}` : grouped;
  return digitsToPersian(withDot);
}
