---
'@callstack/react-native-brownfield': patch
---

fix: package classes from libraries' local jars (`libs/*.jar`) into the Android AAR; previously host apps crashed with NoClassDefFoundError. If your app also has those classes, because it added the jar itself as a workaround or depends on a library that the jar bundles, the build now fails with duplicate classes: remove the app's copy
