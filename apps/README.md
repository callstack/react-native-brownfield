# React Native Brownfield demos

This directory contains demo projects showcasing the usage of the `react-native-brownfield` library.

- `RNApp` - the React Native application that is packaged to AAR and XCFramework archives and integrated into native projects
- `ExpoApp58` - Expo application using Expo SDK v58 (primary Expo Updates demo)
- `ExpoApp57` - Expo application using Expo SDK v57 (default `expo` consumer alias)
- `ExpoAppPreview` - a temporary Expo app generated in CI to test new Expo preview releases before stable support is added
- `RockApp` - an equivalent React Native application powered by [Rock](https://rockjs.dev) (instead of the React Native Community CLI). It shares the same UI as `RNApp` via the `brownfield-example-shared` package and is packaged to AAR / XCFramework using Rock's brownfield plugins.
- `brownfield-example-shared` - workspace package containing the React Native UI shared by `RNApp` and `RockApp` (root `App`, `HomeScreen`, `Counter`, navigation stack, theming helpers, native OS version context)
- `brownfield-example-shared-tests` - workspace package containing the Jest test suites shared by the demo apps
- `AndroidApp` - the native Android application that integrates the packaged AARs (a "consumer" of the RN apps); it comes in these flavors:
  - `expo58` / `expo57` - which use the artifacts produced from `ExpoApp58` / `ExpoApp57`
  - `expopreview` - which uses the artifact produced from `ExpoAppPreview`
  - `vanilla` - which uses the artifact produced from `RNApp`
  - `rock` - which uses the artifact produced from `RockApp`
- `AppleApp` - the native iOS application that integrates packaged XCFrameworks (a "consumer" of the RN apps); the Xcode project defines one target per consumed RN app:
  - `Brownfield Apple App (RNApp)` — vanilla; uses the artifact from `RNApp` (scheme **Brownfield Apple App Vanilla**, configuration `Release Vanilla`)
  - `Brownfield Apple App (RNApp)` — Rock; the same target, using the artifact from `RockApp` (scheme **Brownfield Apple App Rock**, configuration `Release Rock`)
  - `Brownfield Apple App (ExpoApp58)` — uses the artifact from `ExpoApp58` (scheme **Brownfield Apple App Expo 58**, configuration `Release`)
  - `Brownfield Apple App (ExpoApp57)` — uses the artifact from `ExpoApp57` (scheme **Brownfield Apple App Expo 57**, configuration `Release`)
  - `Brownfield Apple App (ExpoAppPreview)` — uses the artifact from `ExpoAppPreview` (scheme **Brownfield Apple App Expo Preview**, configuration `Release`)
  From `apps/AppleApp`, run `yarn build:example:ios-consumer:vanilla`, `yarn build:example:ios-consumer:rock`, `yarn build:example:ios-consumer:expo58`, `yarn build:example:ios-consumer:expo57`, or `yarn build:example:ios-consumer:expopreview` to copy XCFrameworks into `package/` and build the matching target. `yarn build:example:ios-consumer:expo` is an alias for `expo57`.
