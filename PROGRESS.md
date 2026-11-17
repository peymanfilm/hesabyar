# PROGRESS.md — وضعیت اجرای پروژه

**به‌روزرسانی:** ۱۴۰۴/۰۸/۲۶ — نوبت سوم (بعد از گزارش «APK خراب» توسط کاربر)

## فاز فعلی
فاز ۹–۱۰ — **CI سه‌مرحله‌ای کاملاً سبز شد، merge به main انجام شد، tag v1.0.0 زده شد و workflow انتشار در حال اجراست.**

## علت «APK خراب» که کاربر دید
روی صفحهٔ Actions هیچ Release منتشرنشده بود؛ چیزی که کاربر دانسته بود artifact **debug** آزمایشی بود (برای تست ساخت، نه انتشار). علت شکست‌های قبلی هم کشف و رفع شد:
1. **پر شدن دیسک runner** (`No space left on device`) → گام آزادسازی ~۲۵GB به هر سه job سنگین اضافه شد
2. **قطع موقتی CDN Maven Central** هنگام resolve چهار artifact Kotlin 2.2.0 → موقتی بود (200 OK؛ در rerun سبز شد)
3. نسخه‌های patch جدید Expo → هم‌تراز شدند (expo 58.0.26، fs 58.0.14، router 58.0.32، sqlite 58.0.18، jest-expo 58.0.15)

## آخرین کار تکمیل‌شده
- **CI کامل سبز:** run 44097182238 (quality + expo-doctor 20/20 + ساخت debug واقعی، artifact 80MB)
- **merge به main:** commit سبز `18956c1` به main پوش شد (main از قبل خالی بود؛ PR ممکن نبود)
- **tag v1.0.0** روی همان commit زده و پوش شد → workflow `Android Release` اجرا شد (id 44108412550)
- دروازهٔ Secrets امضا: سبز | تست‌ها روی تگ: سبز | build امضاشده: در حال اجرا

## کار در حال انجام
- build signed release APK → apksigner verify → نصب و اجرا روی شبیه‌ساز API 30 → انتشار Release
- پس از سبز شدن: دانلود APK در sandbox، بررسی چک‌سام، به‌روزرسانی TEST_REPORT و RELEASE_CHECKLIST و DELIVERY

## قدم بعدی دقیق
1. سبز شدن کامل `android-release.yml`
2. تأیید Release منتشرشده + لینک مستقیم APK + SHA-256
3. مستندسازی نهایی و گزارش تحویل ۱۲بندی

## commit و workflow مرتبط
- main: `18956c1` | tag: `v1.0.0` | CI سبز: 44097182238 | Release run: 44108412550
