/**
 * تاریخ: سررسیدها date-only هستند (ISO 'YYYY-MM-DD') و به‌دلیل منطقهٔ زمانی
 * جابه‌جا نمی‌شوند. «امروز» همیشه با Asia/Tehran محاسبه می‌شود.
 * نمایش و ماه‌ها شمسی است؛ تبدیل با jalaali-js انجام می‌شود.
 */
import * as jalaali from "jalaali-js";
import { digitsToPersian } from "./persian";

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export const TEHRAN_TZ = "Asia/Tehran";

/** ISO date-only 'YYYY-MM-DD' با محاسبهٔ زمان در تهران */
export function todayISO(tz: string = TEHRAN_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** ساعت فعلی تهران به شکل 'HH:MM' */
export function nowHM(tz: string = TEHRAN_TZ): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function assertISO(s: string): string {
  if (!isISODate(s)) throw new Error(`تاریخ نامعتبر: ${s}`);
  const [m, d] = s.split("-").slice(1).map(Number) as [number, number];
  if (m < 1 || m > 12 || d < 1 || d > 31) throw new Error(`تاریخ نامعتبر: ${s}`);
  return s;
}

/** تبدیل ISO میلادی به بخش‌های شمسی */
export function gregorianToJalali(iso: string): { jy: number; jm: number; jd: number } {
  assertISO(iso);
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return jalaali.toJalaali(y, m, d);
}

/** تبدیل شمسی به ISO میلادی */
export function jalaliToISO(jy: number, jm: number, jd: number): string {
  const g = jalaali.toGregorian(jy, jm, jd);
  return isoOf(g.gy, g.gm, g.gd);
}

export function isoOf(y: number, m: number, d: number): string {
  if (m < 1 || m > 12 || d < 1 || d > 31) throw new Error("تاریخ نامعتبر");
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  const iso = `${y}-${mm}-${dd}`;
  // اعتبارسنجی واقعی روز در ماه میلادی
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error(`تاریخ نامعتبر: ${iso}`);
  }
  return iso;
}

/** طول ماه شمسی (اسفند کبیسه ۳۰ روز) */
export function jalaliMonthLength(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm);
}

export function isJalaliLeap(jy: number): boolean {
  return jalaali.isLeapJalaaliYear(jy);
}

/**
 * نقطهٔ «روز هدف» یک سررسید در ماه شمسی مقصد:
 * اگر روز در ماه مقصد وجود نداشته باشد، آخرین روز ماه انتخاب می‌شود.
 */
export function clampJalaliDay(jy: number, jm: number, targetDay: number): number {
  const len = jalaliMonthLength(jy, jm);
  return Math.min(targetDay, len);
}

/** مقایسهٔ رشته‌ای دو date-only (فرمت ISO مقایسهٔ لغوی درست دارد) */
export function compareISO(a: string, b: string): number {
  assertISO(a);
  assertISO(b);
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** نافص بودن سررسید نسبت به «امروز» — مستقل از وضعیت تسویه */
export function isOverdue(dueISO: string, today: string): boolean {
  return compareISO(dueISO, today) < 0;
}

/** نمایش شمسی: «۱۲ مرداد ۱۴۰۴» */
export function formatJalali(iso: string): string {
  const { jy, jm, jd } = gregorianToJalali(iso);
  return digitsToPersian(`${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`);
}

/** نمایش عددی شمسی: ۱۴۰۴/۰۵/۱۲ */
export function formatJalaliNumeric(iso: string): string {
  const { jy, jm, jd } = gregorianToJalali(iso);
  return digitsToPersian(
    `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`
  );
}

/** کلید ماه شمسی برای گروه‌بندی گزارش‌ها: '1404-05' */
export function jalaliMonthKey(iso: string): string {
  const { jy, jm } = gregorianToJalali(iso);
  return `${jy}-${String(jm).padStart(2, "0")}`;
}

/** سال و ماه شمسی یک کلید */
export function parseJalaliMonthKey(key: string): { jy: number; jm: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) throw new Error(`کلید ماه نامعتبر: ${key}`);
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  if (jm < 1 || jm > 12) throw new Error(`کلید ماه نامعتبر: ${key}`);
  return { jy, jm };
}

/** ماه شمسی بعدی */
export function nextJalaliMonth(jy: number, jm: number): { jy: number; jm: number } {
  return jm === 12 ? { jy: jy + 1, jm: 1 } : { jy, jm: jm + 1 };
}

/** ماه شمسی قبلی */
export function prevJalaliMonth(jy: number, jm: number): { jy: number; jm: number } {
  return jm === 1 ? { jy: jy - 1, jm: 12 } : { jy, jm: jm - 1 };
}

/** ابتدای ماه شمسی به ISO */
export function startOfJalaliMonth(jy: number, jm: number): string {
  return jalaliToISO(jy, jm, 1);
}

/** انتهای ماه شمسی به ISO */
export function endOfJalaliMonth(jy: number, jm: number): string {
  return jalaliToISO(jy, jm, jalaliMonthLength(jy, jm));
}

/** تعداد روز اختلاف بین دو تاریخ میلادی (برای سررسید نزدیک) */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.UTC(...(fromISO.split("-").map(Number) as [number, number, number]));
  const b = Date.UTC(...(toISO.split("-").map(Number) as [number, number, number]));
  return Math.round((b - a) / 86_400_000);
}

/** افزودن n روز به ISO */
export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return isoOf(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** مهر زمان ثبت واقعی (جدای از date-only سررسید) */
export function nowISODateTime(tz: string = TEHRAN_TZ): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const y = get("year");
  const mo = get("month");
  const d = get("day");
  const h = get("hour");
  const mi = get("minute");
  const s = get("second");
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}
