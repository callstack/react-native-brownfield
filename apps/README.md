# React Native Brownfield demos

This directory contains demo projects showcasing the usage of the `react-native-brownfield` library.

- `RNApp` - the React Native application that is packaged to AAR and XCFramework archives and integrated into native projects
- `ExpoApp56` - Expo application using Expo SDK v56 (primary Expo Updates demo)
- `ExpoApp57` - Expo application using Expo SDK v57 (default `expo` consumer alias)
- `ExpoAppPreview` - a temporary Expo app generated in CI to test new Expo preview releases before stable support is added
- `RockApp` - an equivalent React Native application powered by [Rock](https://rockjs.dev) (instead of the React Native Community CLI). It shares the same UI as `RNApp` via the `brownfield-example-shared` package and is packaged to AAR / XCFramework using Rock's brownfield plugins.
- `brownfield-example-shared` - workspace package containing the React Native UI shared by `RNApp` and `RockApp` (root `App`, `HomeScreen`, `Counter`, navigation stack, theming helpers, native OS version context)
- `brownfield-example-shared-tests` - workspace package containing the Jest test suites shared by the demo apps
- `AndroidApp` - the native Android application that integrates the RNApp AAR package (a "consumer" of the RNApp library); it comes in two flavors:
  - `expo` - which uses the artifact produced from `ExpoApp`
  - `vanilla` - which uses the artifact produced from `RNApp`
- `AppleApp` - the native iOS application that integrates packaged XCFrameworks (a "consumer" of the RN apps); the Xcode project defines one target per consumed RN app:
  - `Brownfield Apple App (RNApp)` — vanilla; uses the artifact from `RNApp` (scheme **Brownfield Apple App Vanilla**, configuration `Release Vanilla`)
  - `Brownfield Apple App (ExpoApp56)` — uses the artifact from `ExpoApp56` (scheme **Brownfield Apple App Expo 56**, configuration `Release`)
  - `Brownfield Apple App (ExpoApp57)` — uses the artifact from `ExpoApp57` (scheme **Brownfield Apple App Expo 57**, configuration `Release`)
  - `Brownfield Apple App (ExpoAppPreview)` — uses the artifact from `ExpoAppPreview` (scheme **Brownfield Apple App Expo Preview**, configuration `Release`)
  From `apps/AppleApp`, run `yarn build:example:ios-consumer:vanilla`, `yarn build:example:ios-consumer:expo56`, `yarn build:example:ios-consumer:expo57`, or `yarn build:example:ios-consumer:expopreview` to copy XCFrameworks into `package/` and build the matching target. `yarn build:example:ios-consumer:expo` is an alias for `expo57`.
