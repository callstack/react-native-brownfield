# React Native Brownfield demos

This directory contains demo projects showcasing the usage of the `react-native-brownfield` library.

- `RNApp` - the React Native application that is packaged to AAR and XCFramework archives and integrated into native projects
- `ExpoApp54` - the Expo application that is packaged analogously to the above using React Native Brownfield Expo config plugin; this app uses Expo SDK v54, which is an important test case since pre-55 versions require additional configuration steps
- `ExpoApp55` - another Expo application similar to `ExpoApp54`, but using Expo SDK v55
- `ExpoAppBeta` - a temporary Expo app generated in CI to test new Expo beta releases before stable support is added
- `AndroidApp` - the native Android application that integrates the RNApp AAR package (a "consumer" of the RNApp library); it comes in two flavors:
  - `expo` - which uses the artifact produced from `ExpoApp`
  - `vanilla` - which uses the artifact produced from `RNApp`
- `AppleApp` - the native iOS application that integrates packaged XCFrameworks (a "consumer" of the RN apps); the Xcode project defines one target per consumed RN app:
  - `Brownfield Apple App (RNApp)` — vanilla; uses the artifact from `RNApp` (scheme **Brownfield Apple App Vanilla**, configuration `Release Vanilla`)
  - `Brownfield Apple App (ExpoApp54)` — uses the artifact from `ExpoApp54` (scheme **Brownfield Apple App Expo 54**, configuration `Release`)
  - `Brownfield Apple App (ExpoApp55)` — uses the artifact from `ExpoApp55` (scheme **Brownfield Apple App Expo 55**, configuration `Release`)
  - `Brownfield Apple App (ExpoAppBeta)` — uses the artifact from `ExpoAppBeta` (scheme **Brownfield Apple App Expo Beta**, configuration `Release`)

  From `apps/AppleApp`, run `yarn build:example:ios-consumer:vanilla`, `yarn build:example:ios-consumer:expo54`, `yarn build:example:ios-consumer:expo55`, or `yarn build:example:ios-consumer:expobeta` to copy XCFrameworks into `package/` and build the matching target.

## Additional notes

There are 2 demo apps for Expo: `ExpoApp55` (Expo 55 SDK) and `ExpoApp54` (Expo 54 SDK). This is to test our setup works with both pre- and post-55 Expo SDK versions. It is important since the pre-55 Expo versions require additional handling, which is not applied by our Expo config plugin for Expo >= 55.
