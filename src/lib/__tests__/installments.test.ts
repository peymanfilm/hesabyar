import {
  generateMonthlySchedule,
  sumSchedule,
  scheduleMismatch,
  installmentState,
  installmentStatus,
  loanBalance,
  loanProgress,
  nextOpenInstallment,
} from "../installments";
import { gregorianToJalali } from "../dates";

// وام فرضی: ۱۰۰ میلیون تومان (۱ میلیارد ریال)، ۱۰ قسط ۱۰۰ میلیون ریالی
describe("generateMonthlySchedule — تولید جدول اقساط", () => {
  test("تعداد و جمع اقساط", () => {
    const rows = generateMonthlySchedule("2025-08-03", 10, 100_000_000);
    expect(rows).toHaveLength(10);
    expect(sumSchedule(rows)).toBe(1_000_000_000);
    expect(rows[0]!.seq).toBe(1);
    expect(rows[9]!.seq).toBe(10);
  });
  test("روز هدف اصلی حفظ می‌شود (۱۲ هر ماه)", () => {
    const rows = generateMonthlySchedule("2025-08-03", 6, 1_000_000);
    const days = rows.map((r) => gregorianToJalali(r.dueDate).jd);
    expect(days).toEqual([12, 12, 12, 12, 12, 12]);
  });
  test("کاهش به آخرین روز ماه کوتاه‌تر", () => {
    // شروع ۳۱ شهریور ۱۴۰۴ → قسط دوم مهر (۳۰روزه): کلمپ به ۳۰؛
    // قسط سوم آبان (۳۰روزه): روز هدف ۳۱ → باز هم ۳۰
    const rows = generateMonthlySchedule("2025-09-22", 3, 1_000_000);
    const days = rows.map((r) => gregorianToJalali(r.dueDate).jd);
    expect(days).toEqual([31, 30, 30]);
  });
  test("گذر سال درست", () => {
    const rows = generateMonthlySchedule("2025-03-01", 3, 1_000_000); // ۱۰ اسفند ۱۴۰۳
    const months = rows.map((r) => gregorianToJalali(r.dueDate).jm);
    expect(months).toEqual([12, 1, 2]);
    expect(gregorianToJalali(rows[2]!.dueDate).jy).toBe(1404);
  });
  test("اسفند کبیسه ۳۰روزه و غیر کبیسه ۲۹روزه", () => {
    // کبیسه: ۳۰ اسفند ۱۴۰۳ = ۲۰ مارس ۲۰۲۵؛ روز هدف ۳۰ در فروردین حفظ می‌شود
    const leap = generateMonthlySchedule("2025-03-20", 2, 1_000_000);
    expect(leap[0]!.dueDate).toBe("2025-03-20"); // ۳۰ اسفند ۱۴۰۳
    expect(leap[1]!.dueDate).toBe("2025-04-19"); // ۳۰ فروردین ۱۴۰۴
    // غیرکبیسه: ۲۹ اسفند ۱۴۰۴ = ۲۰ مارس ۲۰۲۶؛ روز هدف ۲۹ حفظ می‌شود
    const nonLeap = generateMonthlySchedule("2026-03-20", 2, 1_000_000);
    expect(nonLeap[0]!.dueDate).toBe("2026-03-20"); // ۲۹ اسفند ۱۴۰۴
    expect(nonLeap[1]!.dueDate).toBe("2026-04-18"); // ۲۹ فروردین ۱۴۰۵
  });
  test("تعداد صفر رد می‌شود", () => {
    expect(() => generateMonthlySchedule("2025-08-03", 0, 1_000)).toThrow();
    expect(() => generateMonthlySchedule("2025-08-03", -1, 1_000)).toThrow();
  });
});

describe("scheduleMismatch — تطبیق کل بازپرداخت", () => {
  test("بدون کل بازپرداخت اختلافی نیست", () => {
    expect(scheduleMismatch(null, generateMonthlySchedule("2025-08-03", 10, 1_000))).toBeNull();
  });
  test("اختلاف گزارش می‌شود", () => {
    const rows = generateMonthlySchedule("2025-08-03", 10, 1_000);
    expect(scheduleMismatch(9_500, rows)).toBe(-500);
    expect(scheduleMismatch(10_000, rows)).toBe(0);
  });
});

describe("installmentState — وضعیت قسط", () => {
  test("پرداخت‌نشده", () => {
    const st = installmentState(100_000_000, 0, "2025-08-03", "2025-08-01");
    expect(st.status).toBe("unpaid");
    expect(st.balance).toBe(100_000_000);
    expect(st.overdue).toBe(false);
  });
  test("پرداخت جزئی", () => {
    const st = installmentState(100_000_000, 40_000_000, "2025-08-03", "2025-08-01");
    expect(st.status).toBe("partial");
    expect(st.balance).toBe(60_000_000);
  });
  test("تسویه‌شده", () => {
    const st = installmentState(100_000_000, 100_000_000, "2025-08-03", "2025-08-01");
    expect(st.status).toBe("settled");
    expect(st.balance).toBe(0);
  });
  test("عقب‌افتادگی مستقل از وضعیت: قسط جزئی‌پرداخت‌شدهٔ گذشته عقب‌افتاده است", () => {
    const st = installmentState(100, 40, "2025-07-31", "2025-08-03");
    expect(st.overdue).toBe(true);
    expect(st.status).toBe("partial");
  });
  test("قسط پرداخت‌نشدهٔ سررسید گذشته عقب‌افتاده است", () => {
    const st = installmentState(100, 0, "2025-07-31", "2025-08-03");
    expect(st.overdue).toBe(true);
    expect(st.status).toBe("unpaid");
  });
  test("قسط تسویه‌شده هرگز عقب‌افتاده نیست", () => {
    const st = installmentState(100, 100, "2025-07-31", "2025-08-03");
    expect(st.overdue).toBe(false);
  });
  test("پرداخت تخصیص‌یافته بیشتر از قسط خطا می‌دهد", () => {
    expect(() => installmentState(100, 120, "2025-08-03", "2025-08-03")).toThrow();
  });
});

describe("loanBalance و loanProgress", () => {
  test("ماندهٔ وام = مجموع ماندهٔ اقساط", () => {
    const rows = [
      { amount: 100, allocated: 100 },
      { amount: 100, allocated: 40 },
      { amount: 100, allocated: 0 },
    ];
    expect(loanBalance(rows)).toBe(160);
  });
  test("پیشرفت", () => {
    const rows = [
      { amount: 100, allocated: 100 },
      { amount: 100, allocated: 50 },
      { amount: 100, allocated: 0 },
    ];
    expect(loanProgress(rows)).toBe(50);
  });
});

describe("nextOpenInstallment", () => {
  test("نزدیک‌ترین قسط باز بعد از امروز", () => {
    const rows = [
      { seq: 1, dueDate: "2025-07-31", amount: 100, allocated: 100 },
      { seq: 2, dueDate: "2025-08-31", amount: 100, allocated: 20 },
      { seq: 3, dueDate: "2025-09-30", amount: 100, allocated: 0 },
    ];
    expect(nextOpenInstallment(rows, "2025-08-03")?.seq).toBe(2);
  });
  test("اگر همهٔ بازها گذشته باشند هیچ‌چیز برنمی‌گردد", () => {
    const rows = [{ seq: 1, dueDate: "2025-07-31", amount: 100, allocated: 0 }];
    expect(nextOpenInstallment(rows, "2025-08-03")).toBeNull();
  });
});

describe("installmentStatus", () => {
  test("مرزها", () => {
    expect(installmentStatus(100, 0)).toBe("unpaid");
    expect(installmentStatus(100, 1)).toBe("partial");
    expect(installmentStatus(100, 99)).toBe("partial");
    expect(installmentStatus(100, 100)).toBe("settled");
  });
});
