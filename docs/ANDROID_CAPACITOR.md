# MGD Android / Capacitor

MGD keeps Phaser/Vite TypeScript as the gameplay authority and uses Capacitor only as the native Android container.

## Identity

- Capacitor: `8.5.2`
- app name: `MGD`
- Android application id: `com.bongohorse.monstergirldelivery`
- web output: `dist/`
- native platform: `android/`
- orientation: `sensorLandscape`
- Android WebView user-agent marker: `MGD-Capacitor/1`
- WebView background: `#121426`

The appended user-agent marker makes Capacitor/WebView captures distinguishable in the existing performance evidence without changing the evidence schema. Browser Chrome captures do not contain this marker.

## Local workflow

Capacitor 8 requires current Android tooling. The official environment guide requires Android Studio plus an Android SDK; this project targets API 36 and supports API 24+ through Capacitor's generated Android configuration.

- `bun install`
- `bun run android:sync` builds Vite and syncs `dist/` into Android.
- `bun run android:open` syncs and opens the native project in Android Studio.
- `bun run android:debug` syncs and assembles the debug APK through the platform-correct Gradle wrapper on Windows/Linux/macOS.

The debug APK is produced under `android/app/build/outputs/apk/debug/`.

Do not edit copied web assets under `android/app/src/main/assets/public/`; `cap sync android` owns them.

## CI boundary

`Android CI` performs a locked Bun install, syncs the production Vite build into the committed Android project, verifies the MGD package/orientation/runtime markers, and runs Gradle unit-test compilation plus `assembleDebug`.

#408 owns publishing the resulting APK as a downloadable/distributed artifact. #407 only proves that the shared web game can be packaged successfully.

## Performance evidence

Browser and Capacitor/WebView benchmark captures are separate runtime populations and must not be compared as if they were the same environment. Capacitor Android captures are identifiable because `display.userAgent` contains `MGD-Capacitor/1`.
