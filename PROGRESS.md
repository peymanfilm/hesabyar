# PROGRESS.md — وضعیت اجرای پروژه

**به‌روزرسانی نهایی:** ۱۴۰۴/۰۸/۲۶ (2026-11-17)

## فاز فعلی
**پروژه کامل و منتشر شد** — فاز ۱۰ (انتشار و تحویل) انجام شد.

## نتیجهٔ نهایی
- **Release v1.0.0 منتشر شد:** https://github.com/peymanfilm/hesabyar/releases/tag/v1.0.0
- APK امضاشده + SHA-256 روی Release؛ دانلود مستقیم ناشناس تأیید شد
- نصب و اجرا روی شبیه‌ساز API 30 در CI موفق (بدون Metro، بدون crash)
- گزارش تحویل ۱۲بندی: DELIVERY.md | شواهد تست: TEST_REPORT.md | چک‌لیست: RELEASE_CHECKLIST.md

## تاریخچهٔ موانع واقعی و رفع آن‌ها (همه مستند شده)
1. نبود اعتبارنامه push → با توکن کاربر حل شد
2. وابستگی‌های file:/tmp در lockfile → نسخه‌های npm واقعی
3. نسخهٔ ناموجود expo-doctor + Node قدیمی → 1.21.8 با Node 24
4. پر شدن دیسک runner → گام آزادسازی ~۲۵GB
5. CDN Maven Central موقتی → rerun
6. نبود `rg` روی runner → grep
7. `lintVitalRelease` fatal (locale) → حذف locales
8. اکشن شبیه‌ساز خطوط را فشرده می‌کند (if/fi شکست) → اسکریپت تک‌خطی‌امن
9. اتمام سهمیهٔ Actions مخزن private → مخزن عمومی شد (پس از scan امنیتی کامل)
10. باگ `gh release edit` بدون checkout → انتشار نهایی با API + fix در main

## قدم بعدی (نسخهٔ بعد)
1. توکن GitHub چت را **چرخش/regenerate** کنید
2. کلید امضا و رمزها (تحویل‌شده در `hesabyar-signing/`) را در جای امن نگه دارید
3. برای v1.0.1: `node scripts/bump-version.mjs 1.0.1` → tag → push → pipeline خودکار
4. رفع گام collect شبیه‌ساز (اسکرین‌شات داخل اسکریپت) و اجرای فلوهای Maestro کامل
