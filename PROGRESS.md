# PROGRESS.md — وضعیت اجرای پروژه

**به‌روزرسانی:** ۱۴۰۴/۰۸/۲۶ (2025-11-17)

## فاز فعلی
فاز ۸ (CI و ساخت) — بخش کد کامل، بخش push/release **مسدود بدون اعتبارنامه GitHub**.

## آخرین کار تکمیل‌شده
- هستهٔ مالی کامل (repo، installments، balances، money، dates، backup، notifications، csv)
- **۱۳۱ تست پاس (۹ مجموعه) روی Node 24 با دیتابیس واقعی sql.js**
- `tsc --noEmit` بدون خطا (strict + noUncheckedIndexedAccess)
- workflowهای ci.yml و android-release.yml
- اسکلت کامل UI (theme، components، router، صفحه‌ها)

## کار در حال انجام
تکمیل صفحات UI و بسته‌بندی برای تحویل به صاحب مخزن.

## خطاهای باز (مسدودکننده)
1. **بدون دسترسی push به `peymanfilm/hesabyar`**: مخزن عمومی نیست و هیچ توکنی در محیط نیست. برای ادامه: صاحب مخزن یا (الف) مخزن را عمومی/باصلاحیت ایجاد کند و (ب) یک Fine-grained PAT با دسترسی Contents: Read&Write روی همان مخزن در دسترس اجرای بعدی قرار دهد (به‌عنوان Secret محیطی، نه پیام چت).
2. **Secrets امضا موجود نیست**: بدون ANDROID_KEYSTORE_BASE64 و هم‌نشین‌ها، workflow انتشار عمداً fail می‌کند تا APK debug جا release نشود.
3. **شبیه‌ساز/SDK محلی نیست**: تست نصب APK و تصاویر واقعی فقط در CI یا دستگاه واقعی ممکن است.

## قدم بعدی دقیق
1. صاحب مخزن دسترسی را فراهم کند (بند «خطاهای باز»).
2. `git push -u origin feature/hesabyar-app` از پوشهٔ پروژه (کد و lockfile آماده‌اند).
3. اجرای workflow `ci.yml`؛ اصلاح خطاها در صورت مشاهده.
4. تنظیم ۴ secret امضا طبق docs/signing.md.
5. `git tag v1.0.0 && git push origin v1.0.0` → اجرای android-release.yml → انتشار draft release پس از سبز شدن.

## commit و workflow مرتبط
- همهٔ فایل‌ها در branch `feature/hesabyar-app` (local) آمادهٔ push هستند.
- workflow مرتبط: `.github/workflows/ci.yml`، `.github/workflows/android-release.yml`.
