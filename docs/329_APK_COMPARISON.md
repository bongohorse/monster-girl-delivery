# #329 paired Android MEM test

The [Android MEM comparison workflow](../.github/workflows/android-memory-comparison.yml) produces a single Actions artifact containing BEFORE and AFTER debug APKs, `build-info.json`, APK metadata, certificate checks and `SHA256SUMS.txt`. The artifact expires after 14 days. Both variants use the **same Android shell from the AFTER commit**, the same 60-second MEM sampler, the same temporary signing certificate within one workflow run and the same package ID `com.bongohorse.monstergirldelivery.memorytest`. The BEFORE gameplay source is pinned to the instrumented historical baseline `7a84e3232336b2192897502869dfe0c2990dcfc9`; its earlier optimization state stays intact. The AFTER gameplay source is recorded in `build-info.json`.

These are test builds with Director enabled. They are separate from the installed public MGD package. Android wrapper behavior belongs to the current AFTER source in **both** variants; this is a comparison of the two game bundles on one wrapper, not a historical Android release comparison. Signatures from separate workflow runs differ.

## On the same Android device

1. Download and extract **one** workflow artifact. Keep its BEFORE and AFTER APKs together; check `SHA256SUMS.txt` if copying them between computers/devices. Allow APK installation from the chosen file manager when Android prompts.
2. Uninstall any earlier **MGD memory test** app. Keep the normal MGD installation. Install `MGD-MEM-BEFORE-*.apk`, open it, allow the game to finish loading and start the normal run.
3. In the Director controls tap **MEM**. It selects 60 FPS, God mode and AUTO hazards. Do not use thrust, other controls, change orientation or leave the app for the next 60 seconds. Wait for `MEM✓`. If the run cancels, restart MEM and capture a complete result.
4. Share the generated `mgd-memory-*.json` using the Android share sheet and label it **BEFORE**. Confirm it contains `schemaVersion: 2`, `activeWallDurationMilliseconds`, `frame` and `heap`. If sharing does not appear, the report remains under the WebView localStorage key `mgd:last-memory-evidence`; retrieve it before uninstalling.
5. Uninstall **MGD memory test** to clear local state. Install `MGD-MEM-AFTER-*.apk` from the **same** artifact. Repeat the same display, power and device conditions, then save and label its JSON **AFTER**.
6. Send both JSON files, the artifact's `build-info.json`, device model/Android WebView version, refresh-rate and power settings, and any noticeable stutters or export failures. For a stronger comparison, repeat with the order reversed after device temperature settles.

Only compare completed captures with similar active wall duration, frame counts and simulation duration. `performance.memory` may be unavailable in Android WebView; in that case `heap.source` is `unavailable`. One-second used-heap differences are a coarse trend, not allocated-byte totals or a GC timeline. For an allocation/GC conclusion, capture comparable Chrome DevTools Memory/Performance traces on the same device and workload in addition to the two MEM JSON reports. Debug Director builds should not be compared against a normal release APK.
