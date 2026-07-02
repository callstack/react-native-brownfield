# React Native Brownfield demos

This directory contains demo projects showcasing the usage of the `react-native-brownfield` library.

- `RNApp` - the React Native application that is packaged to AAR and XCFramework archives and integrated into native projects
- `ExpoApp55` - the Expo application that is packaged analogously to the above using React Native Brownfield Expo config plugin; this app uses Expo SDK v55
- `ExpoAppBeta` - a temporary Expo app generated in CI to test new Expo beta releases before stable support is added
- `AndroidApp` - the native Android application that integrates the RNApp AAR package (a "consumer" of the RNApp library); it comes in two flavors:
  - `expo` - which uses the artifact produced from `ExpoApp`
  - `vanilla` - which uses the artifact produced from `RNApp`
- `AppleApp` - the native iOS application that integrates packaged XCFrameworks (a "consumer" of the RN apps); the Xcode project defines one target per consumed RN app:
  - `Brownfield Apple App (RNApp)` — vanilla; uses the artifact from `RNApp` (scheme **Brownfield Apple App Vanilla**, configuration `Release Vanilla`)
  - `Brownfield Apple App (ExpoApp55)` — uses the artifact from `ExpoApp55` (scheme **Brownfield Apple App Expo 55**, configuration `Release`)
  - `Brownfield Apple App (ExpoAppBeta)` — uses the artifact from `ExpoAppBeta` (scheme **Brownfield Apple App Expo Beta**, configuration `Release`)

  From `apps/AppleApp`, run `yarn build:example:ios-consumer:vanilla`, `yarn build:example:ios-consumer:expo55`, or `yarn build:example:ios-consumer:expobeta` to copy XCFrameworks into `package/` and build the matching target.

## Additional notes

There is one demo app for Expo: `ExpoApp55` (Expo 55 SDK).
