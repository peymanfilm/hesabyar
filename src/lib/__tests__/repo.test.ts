/**
 * جریان مالی کامل روی پایگاه دادهٔ واقعی (sql.js WASM):
 * ثبت شخص → طلب ۱۰ میلیون تومانی → دریافت ۲ و ۳ میلیون → مانده ۵ میلیون
 * → ثبت بدهی → پرداخت جزئی → وام با اقساط → پرداخت جزئی قسط →
 * ویرایش تراکنش → ماندگاری منطق → گزارش بدون دوباره‌شماری → پشتیبان و بازیابی.
 */
import { makeTestDb, type TestDb } from "@/db/__tests__/helpers";
import {
  createPerson,
  createAccount,
  addTransaction,
  getAccountState,
  updateAccount,
  updateTransactionAmount,
  deleteTransaction,
  transactionsOfAccount,
  createLoan,
  loanInstallmentsWithState,
  updateInstallment,
  deleteInstallment,
  canDeletePerson,
  deletePerson,
  monthlyReport,
  setSetting,
  getSetting,
  type SyncDb,
} from "@/lib/repo";
import { generateMonthlySchedule } from "@/lib/installments";
import { buildBackup, validateBackup, restoreBackup, BackupError } from "@/lib/backup";
import { MoneyError } from "@/lib/money";

let tst: TestDb;
const TODAY = "2025-08-03";

beforeAll(async () => {
  tst = await makeTestDb();
});

const db = () => tst.db as unknown as SyncDb;

describe("سناریوی طلب و بدهی (مأموریت §۱۴-ج)", () => {
  test("ثبت شخص و طلب ۱۰ میلیون تومانی", () => {
    const personId = createPerson(db(), { name: "علی محمدی" });
    expect(personId).toBeGreaterThan(0);
    const accId = createAccount(db(), {
      kind: "receivable",
      title: "قرض به علی",
      personId,
      initialAmount: 100_000_000, // ۱۰ میلیون تومان
      createdDate: "2025-07-01",
      dueDate: null,
      settleMode: "irregular",
    });
    expect(accId).toBeGreaterThan(0);
    const st = getAccountState(db(), accId, TODAY);
    expect(st.balance).toBe(100_000_000);
    expect(st.state).toBe("unpaid");
  });

  test("دریافت ۲ میلیون تومان", () => {
    const accId = 1;
    const txnId = addTransaction(
      db(),
      { kind: "receive", amount: 20_000_000, date: "2025-07-15", method: "cash" },
      [{ targetType: "account", targetId: accId, amount: 20_000_000 }],
      { date: "2025-07-15" }
    );
    expect(txnId).toBeGreaterThan(0);
    const st = getAccountState(db(), accId, TODAY);
    expect(st.balance).toBe(80_000_000);
    expect(st.state).toBe("partial");
  });

  test("دریافت ۳ میلیون تومان", () => {
    const accId = 1;
    addTransaction(
      db(),
      { kind: "receive", amount: 30_000_000, date: "2025-07-20", method: "card" },
      [{ targetType: "account", targetId: accId, amount: 30_000_000 }],
      { date: "2025-07-20" }
    );
    const st = getAccountState(db(), accId, TODAY);
    expect(st.balance).toBe(50_000_000); // مانده ۵ میلیون تومان
  });

  test("دریافت بیش از مانده رد می‌شود", () => {
    const accId = 1;
    expect(() =>
      addTransaction(
        db(),
        { kind: "receive", amount: 60_000_000, date: TODAY, method: "cash" },
        [{ targetType: "account", targetId: accId, amount: 60_000_000 }],
        { date: TODAY }
      )
    ).toThrow(MoneyError);
  });

  test("پرداخت روی حساب طلب رد می‌شود (جهت نادرست)", () => {
    const accId = 1;
    expect(() =>
      addTransaction(
        db(),
        { kind: "pay", amount: 1_000_000, date: TODAY, method: "cash" },
        [{ targetType: "account", targetId: accId, amount: 1_000_000 }],
        { date: TODAY }
      )
    ).toThrow();
  });

  test("ناهماهنگی مبلغ تراکنش و تخصیص رد می‌شود", () => {
    expect(() =>
      addTransaction(
        db(),
        { kind: "receive", amount: 10_000_000, date: TODAY, method: "cash" },
        [{ targetType: "account", targetId: 1, amount: 9_000_000 }],
        { date: TODAY }
      )
    ).toThrow();
  });

  test("بدون تخصیص رد می‌شود", () => {
    expect(() =>
      addTransaction(db(), { kind: "receive", amount: 10, date: TODAY, method: "cash" }, [], { date: TODAY })
    ).toThrow();
  });

  test("تراکنش تکراری با دوبار لمس: هر فراخوانی تراکنش مستقل ثبت می‌کند ولی اعتبارسنجی مانده جلوی سرریز را می‌گیرد", () => {
    const accId = 2;
    // حساب بدهی جدید
    createAccount(db(), {
      kind: "debt",
      title: "بدهی به حسین",
      personId: 1,
      initialAmount: 10_000_000,
      createdDate: TODAY,
      dueDate: null,
      settleMode: "irregular",
    });
    addTransaction(db(), { kind: "pay", amount: 10_000_000, date: TODAY, method: "transfer" }, [
      { targetType: "account", targetId: accId, amount: 10_000_000 },
    ], { date: TODAY });
    // دوباره لمس: مانده صفر شده و پرداخت جدید رد می‌شود
    expect(() =>
      addTransaction(db(), { kind: "pay", amount: 10_000_000, date: TODAY, method: "transfer" }, [
        { targetType: "account", targetId: accId, amount: 10_000_000 },
      ], { date: TODAY })
    ).toThrow(MoneyError);
    const st = getAccountState(db(), accId, TODAY);
    expect(st.state).toBe("settled");
    expect(st.balance).toBe(0);
  });

  test("مبلغ اولیه نمی‌تواند کمتر از تسویه‌شده شود", () => {
    const accId = 1; // پرداخت‌شده: ۵۰ میلیون
    expect(() => updateAccount(db(), accId, { initialAmount: 40_000_000 })).toThrow();
    updateAccount(db(), accId, { initialAmount: 100_000_000 }); // بدون تغییر: مجاز
  });
});

describe("سناریوی وام و اقساط", () => {
  test("ثبت وام با اختلاف کل بازپرداخت رد می‌شود", () => {
    const rows = generateMonthlySchedule("2025-08-03", 10, 10_000_000);
    expect(() =>
      createLoan(
        db(),
        {
          title: "وام مسکن",
          bank: "بانک ملی",
          principal: 100_000_000,
          totalRepay: 99_999_999, // اختلاف عمدی
          installmentCount: 10,
          installmentAmount: 10_000_000,
          firstDueDate: "2025-08-03",
          scheduleMode: "monthly",
        },
        rows
      )
    ).toThrow();
  });

  test("ثبت وام درست با تولید اقساط", () => {
    const rows = generateMonthlySchedule("2025-08-03", 10, 10_000_000);
    const loanId = createLoan(
      db(),
      {
        title: "وام مسکن",
        bank: "بانک ملی",
        principal: 100_000_000,
        totalRepay: 100_000_000,
        installmentCount: 10,
        installmentAmount: 10_000_000,
        firstDueDate: "2025-08-03",
        scheduleMode: "monthly",
      },
      rows
    );
    const state = loanInstallmentsWithState(db(), loanId, TODAY);
    expect(state.rows).toHaveLength(10);
    expect(state.balance).toBe(100_000_000);
    expect(state.progress).toBe(0);
  });

  test("پرداخت جزئی قسط اول و سپس پرداخت دوم (چند پرداخت برای یک قسط)", () => {
    const state1 = loanInstallmentsWithState(db(), 1, TODAY);
    const inst1 = state1.rows[0]!;
    addTransaction(db(), { kind: "pay", amount: 4_000_000, date: "2025-08-03", method: "cash" }, [
      { targetType: "loan_installment", targetId: inst1.id, amount: 4_000_000 },
    ], { date: "2025-08-03" });
    addTransaction(db(), { kind: "pay", amount: 6_000_000, date: "2025-08-05", method: "transfer" }, [
      { targetType: "loan_installment", targetId: inst1.id, amount: 6_000_000 },
    ], { date: "2025-08-05" });
    const state2 = loanInstallmentsWithState(db(), 1, TODAY);
    const first = state2.rows[0]!;
    expect(first.status).toBe("settled");
    expect(first.balance).toBe(0);
    expect(state2.balance).toBe(90_000_000);
    expect(state2.progress).toBe(10);
  });

  test("پرداخت بیش از ماندهٔ قسط رد می‌شود", () => {
    const state = loanInstallmentsWithState(db(), 1, TODAY);
    const inst2 = state.rows[1]!;
    expect(() =>
      addTransaction(db(), { kind: "pay", amount: 20_000_000, date: TODAY, method: "cash" }, [
        { targetType: "loan_installment", targetId: inst2.id, amount: 20_000_000 },
      ], { date: TODAY })
    ).toThrow(MoneyError);
  });

  test("اتمیک‌بودن: تراکنش با تخصیص نامعتبر هیچ ردیفی نمی‌گذارد", async () => {
    const before = tst.raw.exec("SELECT COUNT(*) FROM transactions")[0]!.values[0]![0];
    expect(() =>
      addTransaction(
        db(),
        { kind: "pay", amount: 1_000, date: TODAY, method: "cash" },
        [{ targetType: "loan_installment", targetId: 999999, amount: 1_000 }],
        { date: TODAY }
      )
    ).toThrow();
    const after = tst.raw.exec("SELECT COUNT(*) FROM transactions")[0]!.values[0]![0];
    expect(after).toBe(before);
  });

  test("ویرایش مبلغ قسط به کمتر از پرداخت‌شده رد می‌شود؛ بیشتر مجاز است", () => {
    const state = loanInstallmentsWithState(db(), 1, TODAY);
    const first = state.rows[0]!; // ۱۰ میلیون پرداخت‌شده
    expect(() => updateInstallment(db(), first.id, { amount: 5_000_000 })).toThrow();
    updateInstallment(db(), first.id, { amount: 12_000_000 });
    const after = loanInstallmentsWithState(db(), 1, TODAY);
    expect(after.rows[0]!.amount).toBe(12_000_000);
    // بازگرداندن برای ادامهٔ سناریو
    updateInstallment(db(), first.id, { amount: 10_000_000 });
  });

  test("حذف قسط دارای پرداخت ممنوع است", () => {
    const state = loanInstallmentsWithState(db(), 1, TODAY);
    expect(() => deleteInstallment(db(), state.rows[0]!.id)).toThrow();
  });

  test("حذف قسط بدون پرداخت مجاز است", () => {
    const state = loanInstallmentsWithState(db(), 1, TODAY);
    const last = state.rows[state.rows.length - 1]!;
    expect(() => deleteInstallment(db(), last.id)).not.toThrow();
  });

  test("عقب‌افتادگی: اقساط سررسید گذشته بدون پرداخت عقب‌افتاده‌اند", () => {
    const rows = generateMonthlySchedule("2025-01-10", 3, 5_000_000);
    const loanId = createLoan(
      db(),
      {
        title: "وام قدیمی",
        bank: null,
        principal: 15_000_000,
        totalRepay: null,
        installmentCount: 3,
        installmentAmount: 5_000_000,
        firstDueDate: "2025-01-10",
        scheduleMode: "monthly",
      },
      rows
    );
    const state = loanInstallmentsWithState(db(), loanId, TODAY);
    const overdueCount = state.rows.filter((r) => r.overdue).length;
    expect(overdueCount).toBe(3);
  });
});

describe("ویرایش و حذف تراکنش", () => {
  test("ویرایش مبلغ تراکنش و قواعد آن", () => {
    const accId = 1;
    const txns = transactionsOfAccount(db(), accId);
    expect(txns.length).toBeGreaterThanOrEqual(2);
    const txn = txns[0]!; // دریافت ۲۰ میلیون از ماندهٔ ۵۰ میلیون
    updateTransactionAmount(db(), txn.txn.id, 25_000_000); // جمع = ۵۵ > مبلغ اولیه؟ نه: ۲۵+۳۰=۵۵ > ۱۰۰؟ خیر
    const st = getAccountState(db(), accId, TODAY);
    expect(st.paid).toBe(55_000_000);
    // افزایش تا مبلغ اولیه مجاز
    updateTransactionAmount(db(), txn.txn.id, 70_000_000); // ۷۰+۳۰ = ۱۰۰ = مبلغ اولیه
    expect(getAccountState(db(), accId, TODAY).balance).toBe(0);
    // افزایش بیشتر از مبلغ اولیه رد می‌شود
    expect(() => updateTransactionAmount(db(), txn.txn.id, 80_000_000)).toThrow(MoneyError);
    // بازگرداندن
    updateTransactionAmount(db(), txn.txn.id, 20_000_000);
  });

  test("حذف تراکنش مانده را برمی‌گرداند", () => {
    const accId = 2; // بدهی حسین که تسویه شد
    const txns = transactionsOfAccount(db(), accId);
    expect(txns).toHaveLength(1);
    deleteTransaction(db(), txns[0]!.txn.id);
    const st = getAccountState(db(), accId, TODAY);
    expect(st.balance).toBe(10_000_000);
    expect(st.state).toBe("unpaid");
  });
});

describe("حذف شخص با سوابق مالی", () => {
  test("شخص دارای حساب تراکنش‌دار حذف نمی‌شود", () => {
    expect(canDeletePerson(db(), 1).ok).toBe(false);
    expect(() => deletePerson(db(), 1)).toThrow();
  });
  test("شخص بدون سوابق حذف می‌شود", () => {
    const pid = createPerson(db(), { name: "موقتی" });
    expect(() => deletePerson(db(), pid)).not.toThrow();
  });
});

describe("گزارش ماهانه — بدون دوباره‌شماری", () => {
  test("هر تراکنش فقط یک بار شمرده می‌شود", () => {
    const rep = monthlyReport(db(), "2025-07-01", "2025-07-31");
    // جولای: دریافت ۲۰M + دریافت ۳۰M = ۵۰M دریافت؛ پرداخت بدهی حسین در اوت است
    expect(rep.receive).toBe(50_000_000);
    expect(rep.pay).toBe(0);
    // دو ردیف تراکنش با نام شخص
    expect(rep.rows.filter((r) => r.kind === "receive")).toHaveLength(2);
    expect(rep.rows.find((r) => r.personName === "علی محمدی")).toBeDefined();
  });
  test("تراکنش اقساط وام در ماه خودش", () => {
    const rep = monthlyReport(db(), "2025-08-01", "2025-08-31");
    expect(rep.pay).toBeGreaterThanOrEqual(10_000_000); // قسط اول وام
  });
});

describe("تنظیمات", () => {
  test("set/get و به‌روزرسانی", () => {
    setSetting(db(), "unit", "toman");
    expect(getSetting(db(), "unit")).toBe("toman");
    setSetting(db(), "unit", "rial");
    expect(getSetting(db(), "unit")).toBe("rial");
  });
});

describe("پشتیبان‌گیری و بازیابی", () => {
  test("ساخت، اعتبارسنجی و بازیابی کامل داده", async () => {
    const payload = buildBackup(db(), [], "2025-08-03T10:00:00");
    const raw = JSON.stringify(payload);
    const validated = validateBackup(raw);
    expect(validated.data.persons.length).toBeGreaterThan(0);
    expect(validated.data.transactions.length).toBeGreaterThan(0);

    // بازسازی روی دیتابیس جدید
    const fresh = await makeTestDb();
    restoreBackup(fresh.db as unknown as SyncDb, validated);
    const st = getAccountState(fresh.db as unknown as SyncDb, 1, TODAY);
    // علی: ۲۰ + ۷۰ - ۵۰؟ سناریو: ۲۰M (بازگشت‌شده) + ۳۰M = ۵۰M پرداخت، مانده ۵۰M
    expect(st.balance).toBe(50_000_000);

    // تراکنش‌های وام هم حفظ شده‌اند
    const loanState = loanInstallmentsWithState(fresh.db as unknown as SyncDb, 1, TODAY);
    expect(loanState.rows[0]!.status).toBe("settled");
  });

  test("فایل خراب تخریب نمی‌کند", async () => {
    const fresh = await makeTestDb();
    const beforePersons = fresh.raw.exec("SELECT COUNT(*) FROM persons")[0]!.values[0]![0];
    const garbage = "{ this is not json !!!";
    expect(() => validateBackup(garbage)).toThrow(BackupError);
    expect(() => restoreBackup(fresh.db as unknown as SyncDb, validateBackup("{}" as string))).toThrow(BackupError);
    const afterPersons = fresh.raw.exec("SELECT COUNT(*) FROM persons")[0]!.values[0]![0];
    expect(afterPersons).toBe(beforePersons);
  });

  test("فایل با ساختار ناقص رد می‌شود", () => {
    expect(() => validateBackup(JSON.stringify({ format: "other-app" }))).toThrow(BackupError);
    expect(() => validateBackup(JSON.stringify({ format: "hesabyar-backup", version: 99 }))).toThrow(BackupError);
    expect(() =>
      validateBackup(JSON.stringify({ format: "hesabyar-backup", version: 1, schemaVersion: 1, data: {} }))
    ).toThrow(BackupError);
  });

  test("دادهٔ نامعتبر در پشتیبان (مبلغ منفی) رد می‌شود", () => {
    const payload = buildBackup(db(), [], "2025-08-03T10:00:00");
    const corrupted = payload as unknown as Record<string, unknown>;
    const data = { ...payload.data };
    const txns = [...payload.data.transactions];
    (txns[0] as { amount: number }).amount = -5;
    data.transactions = txns;
    corrupted.data = data;
    expect(() => validateBackup(JSON.stringify(corrupted))).toThrow(BackupError);
  });
});
