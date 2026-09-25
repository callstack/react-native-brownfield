---
'@callstack/brownfield-cli': patch
---

Stop defaulting the Expo Android library's `compileSdkVersion` and `targetSdkVersion` to 35. When they aren't set, the generated library now inherits them from the Expo app's root Gradle project, as documented. The hard-coded 35 broke Expo SDK 58, whose dependencies require compileSdk 37 (`checkReleaseAarMetadata` failed with "requires ... to compile against version 37 or later").
