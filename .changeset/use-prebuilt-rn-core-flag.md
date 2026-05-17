---
'@callstack/brownfield-cli': minor
---

Support RN prebuilts in Brownfield, by default enabled in RN >= 0.84, opt-in in RN 0.83; or in Expo 55+ (Expo 54 is not supported).

Add `--use-prebuilt-rn-core` to `brownfield package:ios` so callers can opt into or out of React Native Apple prebuilt binaries; omitting the flag defers to version-aware defaults handled by Rock. The CLI rejects `--use-prebuilt-rn-core` when React Native is older than 0.81 or when the project is Expo SDK older than 55.
