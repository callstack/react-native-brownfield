# React Native Brownfield demos

This directory contains demo projects showcasing the usage of the `react-native-brownfield` library.

- `RNApp` - the React Native application that is packaged to AAR and XCFramework archives and integrated into native projects
- `ExpoApp54` - the Expo application that is packaged analogously to the above using React Native Brownfield Expo config plugin; this app uses Expo SDK v54, which is an important test case since pre-55 versions require additional configuration steps
- `ExpoApp55` - another Expo application similar to `ExpoApp54`, but using Expo SDK v55
- `AndroidApp` - the native Android application that integrates the RNApp AAR package (a "consumer" of the RNApp library); it comes in two flavors:
  - `expo` - which uses the artifact produced from `ExpoApp`
  - `vanilla` - which uses the artifact produced from `RNApp`
- `AppleApp` - the native iOS application that integrates the RNApp XCFramework package (a "consumer" of the RNApp library); it comes in two configurations:
  - `expo` - which uses the artifact produced from `ExpoApp`
  - `vanilla` - which uses the artifact produced from `RNApp`

## Additional notes

There are 2 demo apps for Expo: `ExpoApp55` (Expo 55 SDK) and `ExpoApp54` (Expo 54 SDK). This is to test our setup works with both pre- and post-55 Expo SDK versions. It is important since the pre-55 Expo versions require additional handling, which is not applied by our Expo config plugin for Expo >= 55.
