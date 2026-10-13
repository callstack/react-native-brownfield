---
'@callstack/brownfield-cli': patch
'@callstack/react-native-brownfield': patch
'@callstack/create-react-native-brownfield': patch
---

Support Expo modules in React Native CLI apps. `brownfield package:*` no longer runs `expo prebuild` on projects with committed `android/` and `ios/` directories, which used to delete the brownfield library module. `create-react-native-brownfield` now detects Expo and sets up the iOS framework to use the Expo runtime.
