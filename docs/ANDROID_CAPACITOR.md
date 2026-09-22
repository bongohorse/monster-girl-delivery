# MGD Android / Capacitor

MGD keeps Phaser/Vite TypeScript as the gameplay authority and uses Capacitor only as the native Android container.

## Identity

- Capacitor: 8.5.2
- app name: `MGD`
- Android application id: `com.bongohorse.monstergirldelivery`
- web output: `dist/`
- native platform: `android/`
- orientation: `sensorLandscape`

## Local workflow

- `bun install`
- `bun run android:sync` builds Vite and syncs `dist/` into Android.
- `bun run android:open` syncs and opens the native project in Android Studio.
- `bun run android:debug` syncs and assembles the debug APK with Gradle.

Do not edit copied web assets under `android/app/src/main/assets/public/`; `cap sync android` owns them.

Browser and Capacitor/WebView benchmark captures are separate runtime populations and must not be compared as if they were the same environment.
