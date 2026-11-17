#!/usr/bin/env bash
# ساخت کلید امضای release — فقط برای اجرای محلی توسط صاحب پروژه.
# کلید و رمزها هرگز داخل مخزن یا Release قرار نمی‌گیرند. نگهداری نسخهٔ پشتیبان کلید ضروری است.
set -euo pipefail

OUT="${1:-./hesabyar-release.keystore}"
ALIAS="${2:-hesabyar}"

echo "ساخت keystore در: $OUT"
echo "توجه: رمزها را در جای امن (مثلاً مدیر رمز) نگه دارید؛ بدون کلید ثابت، به‌روزرسانی نسخهٔ بعدی ممکن نیست."

keytool -genkeypair -v \
  -keystore "$OUT" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -storepass "$(head -c 24 /dev/urandom | base64 | tr -d '/+=' | head -c 20)" \
  -dname "CN=Hesabyar, OU=Peymanfilm, O=Peymanfilm, L=Tehran, S=Tehran, C=IR"

echo ""
echo "ساخته شد. حالا چهار secret را تنظیم کنید (docs/signing.md):"
echo "  ANDROID_KEYSTORE_BASE64   ← base64 فایل: base64 -w0 $OUT"
echo "  ANDROID_KEYSTORE_PASSWORD ← رمز store (در خروجی بالا)"
echo "  ANDROID_KEY_ALIAS=$ALIAS"
echo "  ANDROID_KEY_PASSWORD      ← رمز key (در خروجی بالا)"
echo "هشدار: این اسکریپت رمزها را روی صفحه چاپ نمی‌کند؛ passwordهای تصادفی در خروجی keytool -v آمده‌اند — بهتر است storepass/keypass را خودتان انتخاب و در مدیر رمز ذخیره کنید."
