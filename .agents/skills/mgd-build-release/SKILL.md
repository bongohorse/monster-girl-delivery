---
name: mgd-build-release
description: "Create an MGD APK/web test build, deliver an artifact or execute an assigned release through existing build/CI paths. Verify source identity, runtime mode and Android update conditions."
---

# MGD builds and releases

Deliver the requested artifact or authorized publication through existing commands. [AGENTS.md](../../../AGENTS.md) controls permissions; matching authorization already given in the session remains valid. Choose routine build/check/download steps autonomously. A test artifact does not authorize public publication, signing-key changes or data deletion.

## Choose the existing path

Identify source/ref, requested platform and runtime mode from the task and repository defaults. Inspect the selected workflow's actual checkout, overrides and side effects. Read only the instructions needed for that path: [DEVELOPMENT](../../../DEVELOPMENT.md#2-standard-commands), [Android distribution](../../../docs/ANDROID_DISTRIBUTION.md), [local Capacitor packaging](../../../docs/ANDROID_CAPACITOR.md#local-workflow) or [hosted web](../../../docs/PWA_ANDROID.md#hosted-test-build).

| Result | Existing path and important distinction |
|---|---|
| Local web artifact | `bun run build` produces `dist/`; `bun run preview` serves it. No public publication. |
| Test APK | Prefer [Android CI](../../../.github/workflows/android-ci.yml), which supports manual dispatch and uploads debug APK/evidence for 14 days. Its `MGD_ANDROID_DIRECTOR_BUILD=1` enables full Director runtime in a production bundle. PR builds may use a synthetic merge commit. |
| Local APK | `bun run android:debug` rebuilds/syncs web and invokes Gradle; suitable Java/Android SDK tooling is required. Generated copied assets are output, not source to patch. |
| Web publication | [Pages](../../../.github/workflows/pages-deploy.yml) builds PRs without deploying; eligible main pushes or manual main dispatch can publish. Reruns retain their original source. |
| Android tester release | [Android Release](../../../.github/workflows/android-release.yml) creates immutable signed Releases from a new package version on main or supported stable tags contained in main. No manual dispatch; stable signing/pinned certificate are required. Version changes/tag pushes can publish. |

## Build, verify and deliver

1. Record actual commit/ref and local changes. Use an isolated clean checkout when a clean artifact is needed; preserve user work. Keep output and evidence from the same build. For Android PR CI retain `builtCommit` and `prHeadCommit` separately. Embedded short hashes can be overridden by environment metadata and do not alone establish source identity.
2. Run the documented build and applicable checks, or reuse successful checks for that exact source. Use current asset-generation hooks when implemented; planned commands are not available tools. Wait for the build result and retrieve its output. A source CI pass or accepted dispatch is not an artifact.
3. Verify the actual package with existing checks such as `node scripts/verify-web-package.mjs dist` (or the copied Android web directory). Confirm the retrieval URL/file, provided checksum and build metadata. For Android inspect final package/version/signature evidence when relevant to the delivery; `package.json` does not establish debug APK version.
4. Perform available startup/install checks relevant to the request. Clearly separate package/build success, browser launch, device install and interaction. Missing browser/phone access leaves that specific observation pending; it does not prevent delivering an otherwise valid artifact.
5. For an authorized publication, finish preparation then use the existing destination/path and verify the published source/result. If a named source differs from deployable main, identify that mismatch and resolve only the necessary source/destination choice; never substitute latest main or change the workflow/protections to bypass it. If authorization or a consequential destination/version decision is genuinely missing, ask only for that action while continuing independent work. Do not add a new pipeline, change hosting/signing or overwrite immutable release assets to make the task pass.

For an **update APK**, compare actual installed/baseline and candidate application ID, signer certificate and versionCode. Debug APKs default to `1.0`/`1` unless overridden, and PR/non-main CI uses ephemeral signing. A matching stable key plus suitable version ordering supports compatibility; claim an observed in-place update only after testing it against the stated installed baseline. Never silently uninstall or clear user data to simulate an update. Missing signing credentials means a specific signing gap, not permission to create/rotate keys or downgrade a release.

Deliver commit/ref, mode, artifact URL/path and expiry, relevant checksum/signature identity, check results and a short install/playtest instruction. State remaining device/update evidence precisely. Follow existing [TEST_QUALITY](../../../docs/TEST_QUALITY.md#evidence-selection-matrix) and repository completion rules without a separate acceptance approval loop.

## Request examples

| Request | Practical outcome |
|---|---|
| APK for testing | Build the requested ref/mode through CI or a suitable local path and deliver APK plus its existing evidence. No public release/version bump. Without a phone, mark installation untested and provide steps. |
| Publish existing web release | Use already supplied publication authorization for the named source/destination, dispatch the matching main path and verify hosted output. No second permission request; an unrelated Android publication remains outside scope. |
| Update APK | Check final APK identity/version/signer against baseline and deliver the compatible candidate. If the installed baseline is unavailable, state what compatibility evidence is known and what needs the user's device test. |
