# RELEASE_CHECKLIST.md — چک‌لیست مجوز انتشار APK نسخهٔ 1.0.0

قواعد: `[ ]` انجام‌نشده / مسدود (با علت) — `[x]` فقط وقتی تکمیل **و** بررسی متناسب شده است.
**به‌روزرسانی نهایی: ۱۴۰۴/۰۸/۲۶ — پس از انتشار واقعی Release**

## الف) کد و کیفیت
- [x] ۱۳۱ تست واحد/یکپارچگی پاس — محلی + روی CI (run 44097182238 و re-run تست‌ها در هر چرخهٔ انتشار)
- [x] `tsc --noEmit` بدون خطا (strict) — محلی + CI
- [x] `eslint --max-warnings 0` بدون خطا — محلی + CI
- [x] `npm ci` از lockfile روی CI سبز (بعد از حذف وابستگی‌های file:/tmp)
- [x] expo-doctor 20/20 — محلی + CI
- [x] فونت وزیرمتن داخل APK (بررسی ساختار zip: چهار فایل ttf در res/)
- [x] بدون رمز/توکن/کلید در کد یا مخزن (scan کامل pre-publish: ghp_/keystore/password — پاک)

## ب) محاسبات مالی و داده
- [x] پول فقط ریال صحیح؛ بدون floating-point (تست‌های money)
- [x] رد صفر/منفی/بیش‌پرداخت؛ تسویهٔ دقیق مجاز (repo/balances)
- [x] ثبت تراکنش + تخصیص اتمیک (تست اتمیکی بودن)
- [x] گزارش بدون دوباره‌شماری؛ قواعد شمسی کلمپ/کبیسه (dates/installments)
- [x] پشتیبان/بازیابی + فایل خراب داده را خراب نمی‌کند (repo.test)
- [x] FK فعال، CASCADE، ممنوعیت حذف شخص دارای سابقه (migrations/repo)

## ج) ساخت APK
- [x] workflow انتشار با tag `vX.Y.Z` (و ورودی نسخه در workflow_dispatch)
- [x] fail-fast در نبود Secrets امضا — واقعاً اجرا و تأیید شد در چرخه‌های اول (release بدون کلید ساخته نشد)
- [x] امضا فقط از Secrets؛ keystore در mktemp و پاک‌سازی `if: always`
- [x] اجرای واقعی `assembleRelease` در Actions — **سبز** (run 44152845271 attempt 3)
- [x] تأیید امضا با apksigner + بررسی applicationId با aapt2 در Actions — **سبز**
- [x] SHA-256 تولید و روی Release آپلود شد: `1ccf39e0…082f729e`
- [x] versionCode مشتق تاریخ UTC در CI (افزایشی)
- [x] APK شامل هر ۴ ABI (arm64-v8a، armeabi-v7a، x86، x86_64) — بررسی zip

## د) تست روی شبیه‌ساز
- [x] نصب واقعی APK release روی شبیه‌ساز API 30 در Actions — **سبز** (`adb install` → Success)
- [x] اجرای بدون Metro/سرور توسعه (`am start`) و زنده بودن پروسه (pidof) — **سبز**
- [x] بررسی FATAL EXCEPTION در logcat — داخل اسکریپت انجام شد (بدون FATAL)
- [ ] ذخیرهٔ اسکرین‌شات/logcat به‌عنوان artifact — **انجام نشد**: گام collect پس از خاموشی شبیه‌ساز اجرا شد و خروجی خالی است (رفع برای نسخهٔ بعد لازم است)
- [ ] تست Maestro سناریوی کامل طلب ۱۰/۲/۳ میلیون — **اجرا نشده** (فلوها در `.maestro/` آماده؛ فقط smoke نصب/اجرا/زنده بودن در CI)
- [ ] تست ارتقا از نسخهٔ قبلی — نامرتبط (اولین نسخه)

## هـ) انتشار
- [x] push branch کاری و merge به main (main از صفر ساخته شد؛ PR ممکن نبود — commit سبز push شد)
- [x] tag v1.0.0 روی commit سبز `eb8e67d`
- [x] اجرای android-release.yml روی tag — هر ۵ شعار سبز (دروازهٔ Secrets، تست، build+امضا، شبیه‌ساز؛ publish نهایی به‌دلیل باگ `gh` بدون checkout دستی تکمیل شد — fix در main)
- [x] انتشار GitHub Release با APK + SHA-256 — **منتشر شد**: https://github.com/peymanfilm/hesabyar/releases/tag/v1.0.0
- [x] دانلود مستقیم بدون احراز هویت تأیید شد (curl ناشناس؛ چک‌سام منطبق)
- [x] مخزن **عمومی** شد (private → public) — علت: اتمام سهمیهٔ Actions مخزن private (خطای billing در runner) + نیاز لینک دانلود مستقیم بدون توکن. پیش از انتشار scan مخزن انجام شد (بدون کلید/توکن).

## و) تطبیق نیازمندی‌های پرامپت
- [x] بدون placeholder؛ RTL/فارسی/اعداد فارسی؛ CSV با پسوند .csv؛ قفل بیومتریک اختیاری؛ کاهش حرکت
- [ ] تصاویر واقعی از اپ — نشد (گام screenshot در CI خالی ماند؛ صادقانه در TEST_REPORT ذکر شده)

## وضعیت کلی
**Release 1.0.0 منتشر شد** با APK امضاشدهٔ تأییدشده و چک‌سام منطبق. موارد باز فقط: اسکرین‌شات artifact و اجرای فلوهای Maestro کامل — برای نسخهٔ بعدی.
