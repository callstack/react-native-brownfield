---
'@callstack/brownfield-cli': minor
---

Support RN prebuilts in Brownfield, by default enabled in RN >= 0.84, opt-in in RN 0.83.

Add `--use-prebuilt-rn-core` to `brownfield package:ios` so callers can opt into or out of React Native Apple prebuilt binaries; omitting the flag defers to version-aware defaults handled by Rock.
