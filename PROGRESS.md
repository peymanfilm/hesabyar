# PROGRESS.md — وضعیت اجرای پروژه

**به‌روزرسانی:** ۱۴۰۴/۰۸/۲۶ — نوبت دوم (بعد از دریافت توکن دسترسی)

## فاز فعلی
فاز ۸–۹ (CI و ساخت + تست artifact) — **push انجام شد؛ CI در حال اجراست؛ secrets امضا تنظیم شدند.**

## آخرین کار تکمیل‌شده
- دسترسی push با توکن کاربر فراهم شد → branch `feature/hesabyar-app` با موفقیت به GitHub push شد
- رفع خطای lockfile: وابستگی‌های `file:../../../../tmp/*.tgz` به نسخه‌های واقعی npm جایگزین شدند (`eslint@9.39.2`، `eslint-config-expo@58.0.4`، `sql.js@1.13.0`) و `npm ci` محلی از صفر سبز شد
- ۱۳۱/۱۳۱ تست، `tsc` و `eslint` دوباره به‌صورت محلی تأیید شدند
- **کلید امضای release ساخته شد** (keytool، RSA-2048، اعتبار ۳۰ سال) و چهار secret مخزن (ANDROID_KEYSTORE_BASE64/PASSWORD/ALIAS/KEY_PASSWORD) از طریق API تنظیم شد — کلید و رمزها فقط در `download/hesabyar-signing/` برای صاحب پروژه تحویل شده‌اند، در مخزن نیستند
- رفع دو خطای CI: نسخهٔ ناموجود `expo-doctor@1.24.1` → `1.21.8`؛ نیازمندی Node>=22.13 برای expo-doctor و حذف فلگ نامعتبر `--yes`

## کار در حال انجام
- صبر برای سبز شدن کامل `ci.yml` (سه job: quality، expo-doctor، android-dry-build)
- پس از سبز شدن: tag `v1.0.0` → اجرای `android-release.yml` → APK امضاشده → تست شبیه‌ساز → انتشار Release

## خطاهای باز
1. نتیجهٔ اجرای CI بر اساس لاگ واقعی در این فاز ثبت می‌شود (اکنون در حال اجرا).
2. شبیه‌ساز محلی در sandbox نیست — تست نصب APK فقط در CI ممکن است.

## نتیجهٔ تلاش push (واقعی)
- `git push -u origin feature/hesabyar-app` → **موفق** (branch جدید روی مخزن ساخته شد)
- commitها: `903fdaf` (رفع lockfile) → `fe1693e` (نسخهٔ expo-doctor) → `fd70901` (node>=22.13)

## قدم بعدی دقیق
1. سبز شدن کامل CI روی `feature/hesabyar-app` (لاگ واقعی بررسی شود)
2. merge به `main` از طریق PR + merge CI
3. `git tag v1.0.0 && git push origin v1.0.0` → اجرای android-release.yml
4. بررسی artifact، چک‌سام، امضا و تست شبیه‌ساز؛ سپس انتشار Release
5. به‌روزرسانی TEST_REPORT.md و RELEASE_CHECKLIST.md بر اساس نتایج واقعی CI

## commit و workflow مرتبط
- مخزن: https://github.com/peymanfilm/hesabyar (branch: feature/hesabyar-app)
- workflow مرتبط: `.github/workflows/ci.yml`، `.github/workflows/android-release.yml`
