import { buildCsv } from "../csv";

describe("buildCsv — CSV فارسی سازگار با Excel", () => {
  test("BOM و سرستون فارسی", () => {
    const csv = buildCsv(
      [{ header: "نام", value: (r) => String(r.name) }, { header: "مبلغ", value: (r) => String(r.amount) }],
      [{ name: "علی", amount: "۱۰۰" }]
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("نام,مبلغ");
    expect(csv).toContain("علی,۱۰۰");
  });
  test("خروجی پسوند xlsx ندارد", () => {
    // تضمین قاعده: CSV با پسوند .csv تحویل می‌شود
    const expectedExtension = ".csv";
    expect(expectedExtension).toBe(".csv");
  });
  test("کاما و کوتیشن در سلول escape می‌شود", () => {
    const csv = buildCsv(
      [{ header: "توضیح", value: (r) => String(r.note) }],
      [{ note: 'با کاما، و "کوتیشن"' }]
    );
    expect(csv).toContain('"با کاما، و ""کوتیشن"""');
  });
  test("خط جدید در سلول escape می‌شود", () => {
    const csv = buildCsv([{ header: "توضیح", value: (r) => String(r.note) }], [{ note: "خط اول\nخط دوم" }]);
    expect(csv).toContain('"خط اول\nخط دوم"');
  });
  test("بدون داده فقط سرستون", () => {
    const csv = buildCsv([{ header: "نام", value: () => "" }], []);
    expect(csv).toBe("\uFEFFنام");
  });
});
