# MGD Android test distribution

## Canonical build

GitHub Actions is the canonical Android test-build environment. The `Android CI` workflow:

1. checks out the workflow ref and records the exact checked-out commit with `git rev-parse HEAD`;
2. records the PR head separately when the event is `pull_request`;
3. installs the locked Bun dependencies;
4. builds the production Phaser/Vite bundle;
5. syncs that bundle into Capacitor Android;
6. runs the Android identity checks;
7. runs Gradle tests and `assembleDebug` on Java 25;
8. verifies the generated APK signature;
9. publishes a commit-addressed GitHub Actions artifact.

The artifact is named `mgd-android-debug-<built-commit>` and contains:

- `mgd-debug-<12-char-built-commit>.apk`;
- `build-info.json` with the exact checked-out `builtCommit`, nullable `prHeadCommit`, workflow event/ref/run identity, the installed Capacitor version and signing mode;
- `SHA256SUMS.txt`;
- `apk-signature.txt` from Android `apksigner`.

For a normal `main` push, `builtCommit` is the pushed `main` commit. For a pull-request workflow, GitHub normally checks out the synthetic PR merge ref; in that case `builtCommit` identifies that synthetic merge commit and `prHeadCommit` identifies the contributor branch head. These identities must not be treated as interchangeable.

Artifacts are retained for 14 days. The build does not require Codespaces, the personal server, Firebase or a developer workstation.

## Installing a test APK

1. Open the repository's **Actions** tab.
2. Open the successful **Android CI** run for the desired build.
3. Download the `mgd-android-debug-<built-commit>` artifact.
4. Extract the ZIP and transfer/open the `.apk` on the Android device.
5. Android may ask for permission to install apps from the browser/file manager used for the download.
6. Verify that the app reports/runs as `MGD` and starts without browser URL/navigation chrome.

Only install APKs from a known MGD workflow run. `build-info.json`, `SHA256SUMS.txt`, and the artifact name make the downloaded file traceable to the commit that was actually built. When testing a PR artifact, also record its `prHeadCommit` so the triggering branch revision remains visible.

## Test signing and updates

PR builds and manual builds outside `main` always use an ephemeral debug key and receive no test-signing secrets. On `main`, with no repository signing secrets configured, CI falls back to Gradle's runner-local debug key and marks `build-info.json` as `ephemeral-debug`.

That APK is installable, but a later CI runner may use a different debug certificate. Android will then reject an in-place update; uninstall the previous ephemeral build before installing the new one.

Switching an already installed ephemeral-debug build to a newly introduced stable test key also requires one reinstall because Android does not treat a different signing certificate as an update of the existing app. The stable test key provides in-place updates only between builds that are all signed with that same stable test key.

For updateable tester builds, configure a dedicated **non-production test keystore** as GitHub Actions secrets:

- `MGD_ANDROID_TEST_KEYSTORE_BASE64` — base64-encoded keystore bytes;
- `MGD_ANDROID_TEST_KEYSTORE_PASSWORD`;
- `MGD_ANDROID_TEST_KEY_ALIAS`;
- `MGD_ANDROID_TEST_KEY_PASSWORD`.

A partial configuration fails the build instead of silently switching to an incompatible debug certificate. Signing secrets are limited to the preparation and Gradle steps, and the temporary keystore is removed even after failure.

When all four secrets are available on `main`, CI decodes the keystore only into the runner's temporary directory, signs the debug build with it, and records `stable-test` as the signing mode. The keystore and passwords must never be committed to the repository.

The production Play signing key is a separate future concern and must not reuse the test key.

## GitHub Releases for Obtainium

Direct tester updates use GitHub Releases rather than a self-updater inside MGD. The `Android Release` workflow runs when a stable SemVer tag such as `v0.4.1` is pushed.

Release safety rules:

- the tag must match `vMAJOR.MINOR.PATCH` exactly;
- the tagged commit must be contained in `main`;
- `package.json` must contain the same version without the leading `v`;
- all four stable test-signing secrets are mandatory;
- release signing never falls back to Gradle's ephemeral debug certificate.

Android release versions are derived deterministically from the tag:

`versionCode = MAJOR * 1,000,000 + MINOR * 1,000 + PATCH`

For example, `v0.4.1` produces `versionName=0.4.1` and `versionCode=4001`. `MINOR` and `PATCH` must each remain at or below 999. This keeps Android update ordering monotonic for the supported SemVer scheme.

The workflow runs the source quality gates, builds the production web bundle, syncs Capacitor, assembles a signed release APK, verifies its APK signature, and creates or refreshes the matching GitHub Release. Each release contains:

- `MGD-v<version>.apk` — the file Obtainium should install;
- `SHA256SUMS.txt`;
- `build-info.json` with commit, tag, Android version and signing mode;
- `apk-signature.txt` from `apksigner`.

### Publishing a tester release

1. Update `package.json` to the intended stable version and merge that change to `main`.
2. Confirm CI is green on that `main` commit.
3. Create the matching tag, for example `v0.4.1`, on that commit.
4. Push the tag to GitHub.
5. Wait for the `Android Release` workflow to finish successfully.
6. Verify the GitHub Release contains exactly one MGD APK plus the evidence files above.

Do not move or reuse a published version tag for different source code. Publish a new version instead.

### Obtainium setup

Add this repository URL to Obtainium:

`https://github.com/bongohorse/monster-girl-delivery`

Use GitHub as the source. MGD publishes one APK per release with the stable filename pattern `MGD-v<version>.apk`, so an APK filter can be restricted to `^MGD-v.*\\.apk$` if desired.

Once the first stable-key release is installed, later GitHub Releases signed with the same key can update it in place. If the device currently has an `ephemeral-debug` build, uninstall it before installing the first stable-key release. That one-time reinstall is expected because the signing certificate changes.

Obtainium is the update/discovery layer only. Android still enforces package identity, version ordering and signing-certificate compatibility.

## Optional Firebase App Distribution

Firebase App Distribution is an optional delivery layer after the GitHub Actions APK has been proven. It is not the compiler or build authority.

A future/manual distribution job may upload the already-built test APK when these protected credentials are configured:

- Firebase Android app ID;
- authenticated Firebase service-account/Application Default Credentials or an approved CI token;
- optional tester groups.

Distribution failure should not invalidate a successfully compiled and archived GitHub Actions APK.

## Future Play Internal Testing

The later release path is:

`shared Phaser/Vite source -> production web build -> Capacitor sync -> signed Android App Bundle (AAB) -> Google Play Internal Testing`

That path requires version-code policy, release signing/Play App Signing, protected credentials and release-specific validation. None of those secrets belong in source control, and the current debug/test artifact pipeline does not imply production-release readiness.

## Performance evidence

Treat ordinary mobile Chrome/PWA and Capacitor Android WebView as different runtime populations. BEFORE/AFTER comparisons must use the same shell on the same device. Capacitor captures are identifiable because the user agent contains `MGD-Capacitor/1`.

Runtime identification does not prove that browser-style `Blob`/download-link export works inside the Android WebView. Native-safe evidence export and device acceptance are tracked separately in #417.
