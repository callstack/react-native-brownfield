# React Native Brownfield demos

This directory contains demo projects showcasing the usage of the `react-native-brownfield` library.

- `RNApp` - the React Native application that is packaged to AAR and XCFramework archives and integrated into native projects
- `ExpoApp55` - another Expo application similar to `ExpoApp54`, but using Expo SDK v55
- `ExpoApp56` - a fresh Expo SDK v56 application wired into the same Brownfield packaging and consumer-app flows as the older Expo examples
- `ExpoAppBeta` - a temporary Expo app generated in CI to test new Expo beta releases before stable support is added
- `AndroidApp` - the native Android application that integrates the RNApp AAR package (a "consumer" of the RNApp library); it comes in two flavors:
  - `expo` - which uses the artifact produced from `ExpoApp`
  - `vanilla` - which uses the artifact produced from `RNApp`
- `AppleApp` - the native iOS application that integrates packaged XCFrameworks (a "consumer" of the RN apps); the Xcode project defines one target per consumed RN app:
  - `Brownfield Apple App (RNApp)` — vanilla; uses the artifact from `RNApp` (scheme **Brownfield Apple App Vanilla**, configuration `Release Vanilla`)
  - `Brownfield Apple App (ExpoApp55)` — uses the artifact from `ExpoApp55` (scheme **Brownfield Apple App Expo 55**, configuration `Release`)
  - `Brownfield Apple App (ExpoApp56)` — uses the artifact from `ExpoApp56` (scheme **Brownfield Apple App Expo 56**, configuration `Release`)
  - `Brownfield Apple App (ExpoAppBeta)` — uses the artifact from `ExpoAppBeta` (scheme **Brownfield Apple App Expo Beta**, configuration `Release`)
  From `apps/AppleApp`, run `yarn build:example:ios-consumer:vanilla`, `yarn build:example:ios-consumer:expo55`, `yarn build:example:ios-consumer:expo56`, or `yarn build:example:ios-consumer:expobeta` to copy XCFrameworks into `package/` and build the matching target. `yarn build:example:ios-consumer:expo` is an alias for `expo56`.

## Additional notes

There are 3 demo apps for Expo: `ExpoApp56` and `ExpoApp55` (post-55 Expo SDK examples) plus `ExpoApp54` (the pre-55 Expo SDK example). This keeps the repository covered across both the older special-handling path and the newer Expo config plugin path used for Expo SDK >= 55.
