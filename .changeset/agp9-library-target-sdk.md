---
'@callstack/react-native-brownfield': patch
---

Generate the Expo Android library module without `defaultConfig.targetSdk`, which Android Gradle Plugin 9 (Expo SDK 58) removed for libraries and which failed the AAR build with `Unresolved reference 'targetSdk'`. The `targetSdkVersion` option now sets `testOptions.targetSdk` and `lint.targetSdk`, which is all it ever affected for a library.
