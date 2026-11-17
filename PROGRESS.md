# PROGRESS.md — وضعیت اجرای پروژه

**به‌روزرسانی:** ۱۴۰۴/۰۸/۲۶ — نوبت چهارم (چرخهٔ پنجم pipeline انتشار در حال اجراست)

## فاز فعلی
فاز ۹–۱۰ — **build امضاشدهٔ APK دو بار پشت‌سرهم سبز شد؛ مرحلهٔ تست شبیه‌ساز در حال رفع ایراد ابزاری است.**

## کشف مهم دربارهٔ «APK خراب» کاربر
روی GitHub هیچ Release منتشرنشده بود؛ فایلی که کاربر دانسته بود artifact debug آزمایشی بود. زنجیرهٔ واقعی ایرادها (همه کشف و رفع شد):
1. پر شدن دیسک runner (`No space left on device`) → گام آزادسازی ~۲۵GB
2. قطع موقتی CDN Maven Central برای ۴ artifact Kotlin 2.2.0 → موقتی (rerun سبز)
3. `rg` روی runner image جدید موجود نیست (exit 127 در گام apksigner) → grep جایگزین شد
4. `lintVitalRelease` fatal به‌خاطر فایل locale فارسی با کلیدهای خارج از default locale → locales حذف شد (نام اپ همچنان فارسی)
5. **اکشن شبیه‌ساز خطوط اسکریپت را فشرده می‌کند** → ساختار `if/fi` چندخطی شکست parse می‌خورد (`expecting "fi"`) → اسکریپت «تک‌خطی‌امن» بازنویسی شد (جمله‌ها با `;`)
6. APK در چرخهٔ چهارم با موفقیت **روی شبیه‌ساز نصب شد** (`Success`) — فقط ادامهٔ اسکریپت به ایراد بند ۵ خورد

## وضعیت pipeline انتشار (چرخهٔ ۵، run id 44152845271)
- دروازهٔ Secrets: سبز | تست‌ها روی tag: سبز | build امضاشده + apksigner verify: سبز
- شبیه‌ساز API 30: نصب → اجرا → بررسی زنده بودن پروسه (pidof) → بررسی FATAL در logcat
- پس از سبز شدن: draft release → publish → APK + sha256 روی صفحهٔ Release

## قدم بعدی دقیق
1. سبز شدن کامل چرخهٔ ۵ → Release منتشرشده
2. دانلود APK در sandbox و تطبیق SHA-256
3. به‌روزرسانی TEST_REPORT.md و RELEASE_CHECKLIST.md و DELIVERY.md با شواهد واقعی
4. گزارش تحویل ۱۲بندی

## commit و workflow مرتبط
- main/tag: `eb8e67d` = v1.0.0 | CI کیفیت: سبز (سه بار) | Release run: 44152845271
