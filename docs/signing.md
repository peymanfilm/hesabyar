# مدیریت کلید امضای Android (امن)

## اصل‌ها

1. **کلید ثابت:** برای همهٔ نسخه‌های حساب‌یار یک کلید استفاده می‌شود. با کلید جدید، به‌روزرسانی روی دستگاه کاربران ممکن نیست.
2. **کلید هرگز وارد مخزن نمی‌شود:** نه در Git، نه در Release، نه در artifact. `.gitignore` شامل `*.keystore` و `*.jks` است.
3. **کلید فقط هنگام build در فضای موقت باز می‌شود:** در workflow، keystore به `mktemp -d` نوشته، استفاده و در گام `if: always` پاک می‌شود.
4. **Base64 رمزنگاری نیست:** `ANDROID_KEYSTORE_BASE64` فقط جابه‌جایی امن فایل باینری در Secret است؛ امنیت واقعی به محافظت از Secret وابسته است.

## ساخت کلید (فقط یک بار، محلی)

```bash
./scripts/generate-signing-key.sh ./hesabyar-release.keystore hesabyar
# یا دستی:
keytool -genkeypair -v \
  -keystore hesabyar-release.keystore \
  -alias hesabyar \
  -keyalg RSA -keysize 2048 -validity 10950
```

رمزها را در مدیر رمز ذخیره کنید. **نگهداری نسخهٔ پشتیبان کلید و رمزها ضروری است؛** گم شدن کلید یعنی ناتوانی در انتشار به‌روزرسانی برای کاربران فعلی.

## تنظیم Secrets

GitHub → Settings → Secrets and variables → Actions → New repository secret:

| Secret | مقدار | نحوهٔ ساخت |
| --- | --- | --- |
| `ANDROID_KEYSTORE_BASE64` | محتوای base64 | `base64 -w0 hesabyar-release.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | رمز store | همان که موقع ساخت انتخاب کردید |
| `ANDROID_KEY_ALIAS` | `hesabyar` | alias کلید |
| `ANDROID_KEY_PASSWORD` | رمز key | معمولاً همان store password |

Secrets فقط به workflowهای شاخهٔ اصلی/تگ خود مخزن می‌رسند؛ برای PR از fork در دسترس نیستند (رویداد `pull_request` بدون secrets اجرا می‌شود).

## نحوهٔ استفاده در build

پلاگین `plugins/with-signed-release.js` با `expo prebuild` بلوک `signingConfigs.release` را به `android/app/build.gradle` تزریق می‌کند. مقادیر فقط از متغیرهای محیطی خوانده می‌شوند:

- `HESABYAR_KS_FILE` (مسیر فایل موقت)
- `HESABYAR_KS_PASS`
- `HESABYAR_KS_ALIAS`
- `HESABYAR_KS_KEY_PASS`

اگر این متغیرها نباشند، `assembleRelease` با `GradleException` متوقف می‌شود — این رفتار عمدی است تا APK امضای debug هیچ‌وقت به‌عنوان release منتشر نشود.

## پاک‌سازی پس از build

گام `Delete keystore from runner` با شرط `if: always` در همهٔ حالت‌ها اجرا و پوشهٔ موقت را حذف می‌کند. keystore در artifact هم نیست (artifact فقط APK و checksum دارد).

## چرخش کلید (اگر ضروری شد)

با تغییر کلید، applicationId را عوض نکنید — کاربران نصب به‌روزرسانی را از دست می‌دهند. چرخش کلید فقط با انتشار یک نسخهٔ «جدید» قابل نصب مجدد ممکن است؛ پیش از این تصمیم، با صاحب پروژه مشورت کنید.
