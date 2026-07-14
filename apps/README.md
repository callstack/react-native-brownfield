# React Native Brownfield demos

This directory contains demo projects showcasing the usage of the `react-native-brownfield` library.

- `RNApp` - the React Native application that is packaged to AAR and XCFramework archives and integrated into native projects
- `ExpoApp55` - Expo application using Expo SDK v55
- `ExpoApp56` - a fresh Expo SDK v56 application wired into the same Brownfield packaging and consumer-app flows as the older Expo examples
- `ExpoAppPreview` - a temporary Expo app generated in CI to test new Expo preview releases before stable support is added
- `AndroidApp` - the native Android application that integrates the RNApp AAR package (a "consumer" of the RNApp library); it comes in two flavors:
  - `expo` - which uses the artifact produced from `ExpoApp`
  - `vanilla` - which uses the artifact produced from `RNApp`
- `AppleApp` - the native iOS application that integrates packaged XCFrameworks (a "consumer" of the RN apps); the Xcode project defines one target per consumed RN app:
  - `Brownfield Apple App (RNApp)` — vanilla; uses the artifact from `RNApp` (scheme **Brownfield Apple App Vanilla**, configuration `Release Vanilla`)
  - `Brownfield Apple App (ExpoApp55)` — uses the artifact from `ExpoApp55` (scheme **Brownfield Apple App Expo 55**, configuration `Release`)
  - `Brownfield Apple App (ExpoApp56)` — uses the artifact from `ExpoApp56` (scheme **Brownfield Apple App Expo 56**, configuration `Release`)
  - `Brownfield Apple App (ExpoAppPreview)` — uses the artifact from `ExpoAppPreview` (scheme **Brownfield Apple App Expo Preview**, configuration `Release`)
  From `apps/AppleApp`, run `yarn build:example:ios-consumer:vanilla`, `yarn build:example:ios-consumer:expo55`, `yarn build:example:ios-consumer:expo56`, or `yarn build:example:ios-consumer:expopreview` to copy XCFrameworks into `package/` and build the matching target. `yarn build:example:ios-consumer:expo` is an alias for `expo56`.
