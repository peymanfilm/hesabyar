import {
  parseAmountToRial,
  rialToTomanString,
  validatePayAmount,
  remaining,
  MoneyError,
  MAX_RIAL,
} from "../money";

describe("parseAmountToRial — پذیرش ارقام فارسی، عربی و انگلیسی", () => {
  test("ارقام فارسی در واحد تومان", () => {
    expect(parseAmountToRial("۱۰,۰۰۰", "toman")).toBe(100_000);
  });
  test("ارقام عربی", () => {
    expect(parseAmountToRial("٥٠٠", "toman")).toBe(5_000);
  });
  test("ارقام انگلیسی با جداکننده", () => {
    expect(parseAmountToRial("10,000,000", "toman")).toBe(100_000_000);
  });
  test("جداکنندهٔ فارسی ٬", () => {
    expect(parseAmountToRial("۱٬۲۳۴", "toman")).toBe(12_340);
  });
  test("اعشار یک‌رقمی تومان → ریال صحیح", () => {
    expect(parseAmountToRial("۵۰۰,۰۰۰٫۵", "toman")).toBe(5_000_005);
  });
  test("اعشار دو‌رقمی در تومان رد می‌شود", () => {
    expect(() => parseAmountToRial("۱٫۲۳", "toman")).toThrow(MoneyError);
  });
  test("رشتهٔ خالی رد می‌شود", () => {
    expect(() => parseAmountToRial("", "toman")).toThrow(MoneyError);
    expect(() => parseAmountToRial("  ", "toman")).toThrow(MoneyError);
  });
  test("صفر و منفی رد می‌شود", () => {
    expect(() => parseAmountToRial("0", "toman")).toThrow(MoneyError);
    expect(() => parseAmountToRial("-۵", "toman")).toThrow(MoneyError);
  });
  test("متن غیر عددی رد می‌شود", () => {
    expect(() => parseAmountToRial("abc", "toman")).toThrow(MoneyError);
  });
  test("مبالغ خیلی بزرگ رد می‌شوند", () => {
    expect(() => parseAmountToRial("999999999999999999999", "toman")).toThrow(MoneyError);
  });
  test("واحد ریال صحیح است", () => {
    expect(parseAmountToRial("۱۰۰۰۰۰", "rial")).toBe(100_000);
  });
  test("اعشار در ریال رد می‌شود", () => {
    expect(() => parseAmountToRial("۱۰۰٫۵", "rial")).toThrow(MoneyError);
  });
});

describe("rialToTomanString — گرد نشدن بی‌صدا", () => {
  test("بخش‌پذیر بر ۱۰", () => {
    expect(rialToTomanString(50_000_000)).toBe("5000000");
  });
  test("غیر بخش‌پذیر → یک رقم اعشار بدون گرد کردن", () => {
    expect(rialToTomanString(5_000_005)).toBe("500000.5");
    expect(rialToTomanString(7)).toBe("0.7");
  });
  test("ورودی غیر صحیح خطا می‌دهد", () => {
    expect(() => rialToTomanString(1.5)).toThrow(MoneyError);
  });
});

describe("validatePayAmount — قواعد پرداخت", () => {
  test("پرداخت بیش از مانده رد می‌شود", () => {
    expect(() => validatePayAmount(1_000, 500)).toThrow(MoneyError);
  });
  test("پرداخت دقیق مانده مجاز است", () => {
    expect(() => validatePayAmount(500, 500)).not.toThrow();
  });
  test("صفر و منفی رد می‌شود", () => {
    expect(() => validatePayAmount(0, 500)).toThrow(MoneyError);
    expect(() => validatePayAmount(-10, 500)).toThrow(MoneyError);
  });
  test("سقف امن", () => {
    expect(() => validatePayAmount(MAX_RIAL + 1, MAX_RIAL)).toThrow(MoneyError);
  });
});

describe("remaining — مانده بدون منفی‌شدن", () => {
  test("مانده درست", () => {
    expect(remaining(10_000_000, 3_000_000)).toBe(7_000_000);
  });
  test("پرداخت بیش از کل خطا می‌دهد", () => {
    expect(() => remaining(1_000, 2_000)).toThrow(MoneyError);
  });
});
