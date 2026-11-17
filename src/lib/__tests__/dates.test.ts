import {
  gregorianToJalali,
  jalaliToISO,
  jalaliMonthLength,
  isJalaliLeap,
  clampJalaliDay,
  isOverdue,
  compareISO,
  formatJalali,
  formatJalaliNumeric,
  jalaliMonthKey,
  parseJalaliMonthKey,
  startOfJalaliMonth,
  endOfJalaliMonth,
  daysBetween,
  addDaysISO,
  todayISO,
  nextJalaliMonth,
  prevJalaliMonth,
} from "../dates";

describe("تبدیل شمسی ↔ میلادی", () => {
  test("۱۲ مرداد ۱۴۰۴ = ۳ اوت ۲۰۲۵", () => {
    const j = gregorianToJalali("2025-08-03");
    expect([j.jy, j.jm, j.jd]).toEqual([1404, 5, 12]);
    expect(jalaliToISO(1404, 5, 12)).toBe("2025-08-03");
  });
  test("۱ فروردین ۱۴۰۴ = ۲۱ مارس ۲۰۲۵", () => {
    expect(jalaliToISO(1404, 1, 1)).toBe("2025-03-21");
  });
  test("اسفند سال کبیسه ۳۰ روز دارد", () => {
    // ۱۴۰۳ کبیسه است
    expect(isJalaliLeap(1403)).toBe(true);
    expect(jalaliMonthLength(1403, 12)).toBe(30);
    expect(jalaliMonthLength(1404, 12)).toBe(29);
  });
  test("طول ماه‌های ۳۱/۳۰/۲۹ روزه", () => {
    expect(jalaliMonthLength(1404, 1)).toBe(31);
    expect(jalaliMonthLength(1404, 7)).toBe(30);
    expect(jalaliMonthLength(1404, 11)).toBe(30);
  });
});

describe("clampJalaliDay — روز هدف در ماه مقصد", () => {
  test("روز ۳۱ در ماه ۳۰روزه به آخرین روز می‌رسد", () => {
    // مهر ۱۴۰۴ سی روز است
    expect(clampJalaliDay(1404, 7, 31)).toBe(30);
  });
  test("روز ۳۰ در اسفند غیر کبیسه می‌شود ۲۹", () => {
    expect(clampJalaliDay(1404, 12, 30)).toBe(29);
  });
  test("روز ۳۰ در اسفند کبیسه حفظ می‌شود", () => {
    expect(clampJalaliDay(1403, 12, 30)).toBe(30);
  });
  test("روز هدف در ماه بلند حفظ می‌شود", () => {
    expect(clampJalaliDay(1404, 1, 31)).toBe(31);
  });
});

describe("isOverdue — عقب‌افتادگی", () => {
  test("سررسید قبل از امروز عقب‌افتاده است", () => {
    expect(isOverdue("2025-07-31", "2025-08-03")).toBe(true);
  });
  test("سررسید امروز عقب‌افتاده نیست", () => {
    expect(isOverdue("2025-08-03", "2025-08-03")).toBe(false);
  });
  test("سررسید آینده عقب‌افتاده نیست", () => {
    expect(isOverdue("2025-09-01", "2025-08-03")).toBe(false);
  });
});

describe("compareISO و daysBetween", () => {
  test("مقایسهٔ لغوی درست", () => {
    expect(compareISO("2025-08-03", "2025-08-04")).toBe(-1);
    expect(compareISO("2025-08-03", "2025-08-03")).toBe(0);
    expect(compareISO("2025-09-01", "2025-08-30")).toBe(1);
  });
  test("اختلاف روز", () => {
    expect(daysBetween("2025-08-03", "2025-08-31")).toBe(28);
    expect(daysBetween("2025-08-03", "2025-08-03")).toBe(0);
  });
});

describe("نمایش و کلید ماه شمسی", () => {
  test("نمایش متنی", () => {
    expect(formatJalali("2025-08-03")).toBe("۱۲ مرداد ۱۴۰۴");
  });
  test("نمایش عددی", () => {
    expect(formatJalaliNumeric("2025-08-03")).toBe("۱۴۰۴/۰۵/۱۲");
  });
  test("کلید ماه", () => {
    expect(jalaliMonthKey("2025-08-03")).toBe("1404-05");
    const { jy, jm } = parseJalaliMonthKey("1404-05");
    expect([jy, jm]).toEqual([1404, 5]);
  });
  test("ماه بعد و قبل با گذر سال", () => {
    expect(nextJalaliMonth(1404, 12)).toEqual({ jy: 1405, jm: 1 });
    expect(prevJalaliMonth(1404, 1)).toEqual({ jy: 1403, jm: 12 });
  });
  test("ابتدا و انتهای ماه شمسی", () => {
    expect(startOfJalaliMonth(1404, 5)).toBe("2025-07-23");
    expect(endOfJalaliMonth(1404, 5)).toBe("2025-08-22");
    // اسفند ۱۴۰۳ کبیسه: ۳۰ اسفند = ۲۰ مارس ۲۰۲۵ (هم‌زمان با ۱ فروردین ۱۴۰۴ در سال بعد)
    expect(endOfJalaliMonth(1403, 12)).toBe("2025-03-20");
  });
});

describe("addDaysISO", () => {
  test("افزودن روز با گذر ماه و سال", () => {
    expect(addDaysISO("2025-08-03", 1)).toBe("2025-08-04");
    expect(addDaysISO("2025-08-31", 1)).toBe("2025-09-01");
    expect(addDaysISO("2025-12-31", 1)).toBe("2026-01-01");
  });
  test("منفی نیز کار می‌کند", () => {
    expect(addDaysISO("2025-08-03", -7)).toBe("2025-07-27");
  });
});

describe("todayISO — منطقهٔ زمانی تهران", () => {
  test("خروجی ISO است و با Intl تهران سازگار است", () => {
    const today = todayISO();
    expect(/^\d{4}-\d{2}-\d{2}$/.test(today)).toBe(true);
    const viaParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    expect(today).toBe(viaParts);
  });
});
