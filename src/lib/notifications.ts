/**
 * زمان‌بندی یادآوری‌ها — خالص و قابل تست.
 * - شناسهٔ اعلان قطعی (deterministic) برای جلوگیری از اعلان تکراری
 * - آتش‌خوردن: سررسید − daysBefore روز، ساعت HH:MM تهران
 * - محدودیت تعداد اعلان سیستم‌عامل: نزدیک‌ترین‌ها با اولویت حفظ می‌شوند (MAX_SCHEDULED)
 * - تعویق: پلن افست ۱ روزه
 *
 * توجه: تایمر JavaScript جای اعلان واقعی استفاده نمی‌شود؛ این ماژول فقط پلن
 * می‌سازد و expo-notifications (لایهٔ app) آن را زمان‌بندی می‌کند.
 */
import { assertISO, daysBetween, addDaysISO, gregorianToJalali } from "./dates";

export const REMINDER_OFFSETS = [0, 1, 3, 7] as const;
/** سقف عملی اعلان‌های زمان‌بندی‌شده در اندروید */
export const MAX_SCHEDULED = 40;

export interface ReminderPlan {
  notifId: string;
  fireAtEpoch: number; // epoch millis
  title: string;
  body: string;
  url: string;
}

export interface ReminderSource {
  targetType: "loan_installment" | "account" | "account_installment";
  targetId: number;
  dueDate: string; // ISO
  daysBefore: number;
  time: string; // 'HH:MM'
  enabled: boolean;
  title: string; // عنوان نمایشی برای متن اعلان
  amountText: string;
}

/** تبدیل تاریخ+ساعت تهران به epoch (تهران از ۱۴۰۲ بدون DST است، افست ثابت ۳:۳۰) */
export function tehranEpoch(iso: string, hm: string): number {
  assertISO(iso);
  const m = /^(\d{2}):(\d{2})$/.exec(hm);
  if (!m) throw new Error(`ساعت نامعتبر: ${hm}`);
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h >= 24 || mi >= 60) throw new Error(`ساعت نامعتبر: ${hm}`);
  const [y, mo, d] = iso.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, mo - 1, d, h - 3, mi - 30, 0);
}

/** ساخت شناسهٔ قطعی برای جلوگیری از تکرار */
export function notifIdFor(source: ReminderSource): string {
  return `r-${source.targetType}-${source.targetId}-${source.daysBefore}-${source.dueDate}`;
}

/**
 * پلن اعلان‌ها از منابع فعال.
 * موارد گذشته (سررسید یا آتش‌خوردن گذشته) پلن نمی‌شوند.
 */
export function buildReminderPlans(sources: ReminderSource[], nowEpoch: number, todayISO: string): ReminderPlan[] {
  const plans: ReminderPlan[] = [];
  for (const src of sources) {
    if (!src.enabled) continue;
    const fireDate = addDaysISO(src.dueDate, -src.daysBefore);
    if (daysBetween(todayISO, fireDate) < 0) continue; // آتش‌خوردن گذشته
    const epoch = tehranEpoch(fireDate, src.time);
    if (epoch <= nowEpoch) continue;
    plans.push({
      notifId: notifIdFor(src),
      fireAtEpoch: epoch,
      title: src.title,
      body:
        src.daysBefore === 0
          ? `${src.title} امروز سررسید شد — ${src.amountText}`
          : `${src.title} تا ${src.daysBefore} روز دیگر سررسید می‌شود — ${src.amountText}`,
      url:
        src.targetType === "loan_installment"
          ? `/installments/${src.targetId}`
          : src.targetType === "account"
            ? `/accounts/${src.targetId}`
            : `/accounts/${src.targetId}`,
    });
  }
  plans.sort((a, b) => a.fireAtEpoch - b.fireAtEpoch);
  return plans;
}

/** برش پلن به سقف سیستم‌عامل — نزدیک‌ترین‌ها اول */
export function capPlans(plans: ReminderPlan[], max = MAX_SCHEDULED): ReminderPlan[] {
  return plans.slice(0, max);
}

/** یادآوری عقب‌افتادگی: یک اعلان روزانهٔ جمعی */
export function overdueReminderPlan(
  overdueTitles: string[],
  todayISO: string,
  hour = 10
): ReminderPlan | null {
  if (overdueTitles.length === 0) return null;
  const epoch = tehranEpoch(todayISO, `${String(hour).padStart(2, "0")}:00`);
  const { jd } = gregorianToJalali(todayISO);
  void jd;
  return {
    notifId: `overdue-${todayISO}`,
    fireAtEpoch: epoch,
    title: `${overdueTitles.length} سررسید عقب‌افتاده`,
    body: overdueTitles.slice(0, 3).join("، ") + (overdueTitles.length > 3 ? " و …" : ""),
    url: "/(tabs)/installments",
  };
}

/** پلن تعویق: فردا در همان ساعت */
export function snoozePlan(plan: ReminderPlan, nowEpoch: number): ReminderPlan {
  const fireDate = addDaysISO(
    new Date(plan.fireAtEpoch).toISOString().slice(0, 10),
    1
  );
  const hm = new Date(plan.fireAtEpoch)
    .toLocaleTimeString("en-GB", { timeZone: "UTC", hour12: false })
    .slice(0, 5);
  const epoch = tehranEpoch(fireDate, hm);
  return {
    ...plan,
    notifId: `${plan.notifId}-snooze-${fireDate}`,
    fireAtEpoch: epoch <= nowEpoch ? nowEpoch + 60_000 : epoch,
  };
}
