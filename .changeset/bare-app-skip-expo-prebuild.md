---
'@callstack/brownfield-cli': patch
---

Skip `expo prebuild` in React Native CLI apps that use Expo modules. Prebuild used to regenerate their committed `android/` and `ios/` directories and delete the brownfield library module.
