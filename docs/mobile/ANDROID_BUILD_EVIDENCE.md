# Android APK build and launch evidence

Date: 2026-10-14

- Command: `gradlew.bat assembleDebug --no-daemon -PreactNativeArchitectures=x86_64` using process-only `JAVA_HOME` and Android SDK variables. Build successful.
- APK: `mobile-app/android/app/build/outputs/apk/debug/app-debug.apk`; 56,147,630 bytes.
- APK contents include `assets/index.android.bundle` and `lib/x86_64/libreactnative.so`.
- `adb install -r` succeeded on `emulator-5554`.
- `com.erp.companion/.MainActivity` resumed. UI hierarchy contains `تسجيل الدخول إلى ERP`, `اسم المستخدم`, `كلمة المرور`, and `دخول`.
- Host TCP port 8081 had no listener when checked; the login screen therefore loaded from the packaged bundle without Metro.
- Screenshot: `android-login-20261014.png`; hierarchy: `android-login-20261014.xml`.
- Not verified: live backend login, SMS/notification capture, deposit/withdrawal recording, offline replay, read-only restrictions, foreground-service behavior, and iOS.
