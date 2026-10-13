---
'@callstack/brownfield-cli': patch
'@callstack/react-native-brownfield': patch
'@callstack/create-react-native-brownfield': patch
---

Support Expo modules in React Native CLI apps. `brownfield package:*` no longer runs `expo prebuild` on projects with committed `android/` and `ios/` directories, which used to delete the brownfield library module. `create-react-native-brownfield` now detects Expo and sets up the iOS framework to use the Expo runtime.

`--use-prebuilt-expo` now also turns Expo's precompiled modules on or off for `pod install`, and turns on Swift explicit modules so packaging works in projects that still carry the old `SWIFT_ENABLE_EXPLICIT_MODULES = NO` workaround. It defaults to building Expo from source when the app's React Native version doesn't match the one Expo's precompiled modules were built for.
