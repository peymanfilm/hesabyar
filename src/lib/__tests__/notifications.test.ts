import { buildReminderPlans, capPlans, notifIdFor, overdueReminderPlan, snoozePlan, tehranEpoch, MAX_SCHEDULED, type ReminderSource } from "../notifications";
import { addDaysISO } from "../dates";

const nowEpoch = Date.UTC(2025, 7, 3, 5, 0, 0); // 2025-08-03 08:30 تهران
const today = "2025-08-03";

const src = (over: Partial<ReminderSource> = {}): ReminderSource => ({
  targetType: "loan_installment",
  targetId: 1,
  dueDate: "2025-08-10",
  daysBefore: 7,
  time: "09:00",
  enabled: true,
  title: "قسط وام مسکن",
  amountText: "۵,۰۰۰,۰۰۰ تومان",
  ...over,
});

describe("tehranEpoch — ساعت تهران به epoch", () => {
  test("۰۹:۰۰ تهران = ۰۵:۳۰ UTC", () => {
    expect(tehranEpoch("2025-08-03", "09:00")).toBe(Date.UTC(2025, 7, 3, 5, 30, 0));
  });
  test("ساعت نامعتبر رد می‌شود", () => {
    expect(() => tehranEpoch("2025-08-03", "25:00")).toThrow();
  });
});

describe("buildReminderPlans", () => {
  test("یادآوری ۷ روز قبل", () => {
    const plans = buildReminderPlans([src()], nowEpoch, today);
    expect(plans).toHaveLength(1);
    expect(plans[0]!.notifId).toBe(notifIdFor(src()));
    expect(plans[0]!.fireAtEpoch).toBe(tehranEpoch("2025-08-03", "09:00")); // دقیقا ۰۹:۰۰ تهران
  });
  test("یادآوری همان روز سررسید", () => {
    const plans = buildReminderPlans([src({ daysBefore: 0 })], nowEpoch, today);
    expect(plans[0]!.fireAtEpoch).toBe(tehranEpoch("2025-08-10", "09:00"));
  });
  test("موارد گذشته پلن نمی‌شوند", () => {
    const plans = buildReminderPlans([src({ dueDate: "2025-07-20" })], nowEpoch, today);
    expect(plans).toHaveLength(0);
  });
  test("غیرفعال پلن نمی‌شود", () => {
    expect(buildReminderPlans([src({ enabled: false })], nowEpoch, today)).toHaveLength(0);
  });
  test("شناسهٔ قطعی — دو بار اجرا شناسهٔ یکسان می‌دهد (بدون تکرار اعلان)", () => {
    const a = notifIdFor(src());
    const b = notifIdFor(src());
    expect(a).toBe(b);
  });
  test("مرتب‌سازی نزدیک‌ترین اول", () => {
    const plans = buildReminderPlans(
      [src({ targetId: 2, dueDate: "2025-08-20", daysBefore: 1 }), src({ targetId: 3, dueDate: "2025-08-10", daysBefore: 1 })],
      nowEpoch,
      today
    );
    expect(plans[0]!.fireAtEpoch).toBeLessThan(plans[1]!.fireAtEpoch);
  });
});

describe("capPlans — محدودیت سیستم‌عامل", () => {
  test("بیش از سقف بریده می‌شود و نزدیک‌ترین‌ها می‌مانند", () => {
    const sources = Array.from({ length: 60 }, (_, i) =>
      src({ targetId: i + 1, dueDate: addDaysISO(today, i + 1), daysBefore: 0 })
    );
    const plans = capPlans(buildReminderPlans(sources, nowEpoch, today));
    expect(plans.length).toBeLessThanOrEqual(MAX_SCHEDULED);
  });
});

describe("overdueReminderPlan و snoozePlan", () => {
  test("بدون عقب‌افتادگی پلن نیست", () => {
    expect(overdueReminderPlan([], today)).toBeNull();
  });
  test("با عقب‌افتادگی پلن روزانه با شناسهٔ قطعی", () => {
    const p1 = overdueReminderPlan(["قسط A"], today)!;
    const p2 = overdueReminderPlan(["قسط A"], today)!;
    expect(p1.notifId).toBe(p2.notifId);
  });
  test("تعویق یک روز بعد می‌آید و شناسهٔ متفاوت دارد", () => {
    const base = buildReminderPlans([src()], nowEpoch, today)[0]!;
    const snoozed = snoozePlan(base, nowEpoch);
    expect(snoozed.fireAtEpoch).toBeGreaterThan(base.fireAtEpoch);
    expect(snoozed.notifId).not.toBe(base.notifId);
  });
});
