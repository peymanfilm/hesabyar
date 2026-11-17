import { accountState, personNetSummary, allocatePayment } from "../balances";

// طلب ۱۰ میلیون تومانی = ۱۰۰ میلیون ریال
describe("accountState — وضعیت حساب طلب/بدهی", () => {
  test("طلب بدون دریافت: پرداخت‌نشده", () => {
    const st = accountState("receivable", 100_000_000, [], null, "2025-08-03");
    expect(st.balance).toBe(100_000_000);
    expect(st.state).toBe("unpaid");
    expect(st.overdue).toBe(false); // بدون سررسید عقب‌افتاده محسوب نمی‌شود
  });
  test("دریافت جزئی از طلب", () => {
    const st = accountState("receivable", 100_000_000, [20_000_000, 30_000_000], null, "2025-08-03");
    expect(st.paid).toBe(50_000_000);
    expect(st.balance).toBe(50_000_000);
    expect(st.state).toBe("partial");
  });
  test("تسویه کامل", () => {
    const st = accountState("debt", 100_000_000, [100_000_000], null, "2025-08-03");
    expect(st.state).toBe("settled");
    expect(st.balance).toBe(0);
  });
  test("سررسید گذشتهٔ عقب‌افتاده", () => {
    const st = accountState("receivable", 100_000_000, [], "2025-07-31", "2025-08-03");
    expect(st.overdue).toBe(true);
  });
  test("حساب بدون سررسید هرگز عقب‌افتاده نیست", () => {
    const st = accountState("debt", 100_000_000, [], null, "2030-01-01");
    expect(st.overdue).toBe(false);
  });
  test("جمع پرداخت بیش از مبلغ اولیه خطا می‌دهد", () => {
    expect(() => accountState("receivable", 100, [100, 1], null, "2025-08-03")).toThrow();
  });
});

describe("تهاتر — طلب و بدهی خودکار تهاتر نمی‌شوند", () => {
  test("جملهٔ خالص شخص توصیفی است، نه تهاتر واقعی", () => {
    const r = personNetSummary(10_000_000, 4_000_000);
    expect(r.net).toBe(6_000_000);
    expect(r.sentence).toContain("طلب");
  });
  test("بدهی خالص", () => {
    const r = personNetSummary(1_000_000, 5_000_000);
    expect(r.net).toBe(-4_000_000);
    expect(r.sentence).toContain("بدهکارید");
  });
  test("صفر", () => {
    const r = personNetSummary(0, 0);
    expect(r.net).toBe(0);
  });
});

describe("allocatePayment — تخصیص پرداخت به اقساط باز", () => {
  const open = [
    { id: 1, amount: 100, allocated: 0, dueDate: "2025-08-31" },
    { id: 2, amount: 100, allocated: 0, dueDate: "2025-09-30" },
    { id: 3, amount: 100, allocated: 0, dueDate: "2025-07-31" },
  ];
  test("به قدیمی‌ترین سررسید اول تخصیص می‌یابد", () => {
    const out = allocatePayment(50, open);
    expect(out).toEqual([{ id: 3, amount: 50 }]);
  });
  test("سرریز به قسط بعدی", () => {
    const out = allocatePayment(150, open);
    expect(out).toEqual([
      { id: 3, amount: 100 },
      { id: 1, amount: 50 },
    ]);
  });
  test("مبلغ بیشتر از ماندهٔ کل رد می‌شود", () => {
    expect(() => allocatePayment(400, open)).toThrow();
  });
  test("مبلغ صفر یا منفی رد می‌شود", () => {
    expect(() => allocatePayment(0, open)).toThrow();
    expect(() => allocatePayment(-5, open)).toThrow();
  });
  test("قسطی که بدهی دارد به ترتیب درست پر می‌شود", () => {
    const partial = [
      { id: 1, amount: 100, allocated: 60, dueDate: "2025-08-31" },
      { id: 2, amount: 100, allocated: 0, dueDate: "2025-09-30" },
    ];
    const out = allocatePayment(80, partial);
    expect(out).toEqual([
      { id: 1, amount: 40 },
      { id: 2, amount: 40 },
    ]);
  });
});
