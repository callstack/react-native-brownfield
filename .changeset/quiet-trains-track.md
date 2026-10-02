---
'@callstack/react-native-brownfield': patch
---

fix: publish dependencies of community libraries (e.g. react-native-screens, lottie-react-native) embedded in Expo brownfield AARs; the published POM now lists them, previously host apps could crash with NoClassDefFoundError
