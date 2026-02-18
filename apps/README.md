# React Native Brownfield demos

This directory contains demo projects showcasing the usage of the `react-native-brownfield` library.

- `RNApp` - the React Native application that is packaged to AAR and XCFramework archives and integrated into native projects
- `ExpoApp` - the Expo application that is packaged analogously to the above using React Native Brownfield Expo config plugin
- `AndroidApp` - the native Android application that integrates the RNApp AAR package (a "consumer" of the RNApp library); it comes in two flavors:
  - `expo` - which uses the artifact produced from `ExpoApp`
  - `vanilla` - which uses the artifact produced from `RNApp`
- `AppleApp` - the native iOS application that integrates the RNApp XCFramework package (a "consumer" of the RNApp library); it comes in two configurations:
  - `expo` - which uses the artifact produced from `ExpoApp`
  - `vanilla` - which uses the artifact produced from `RNApp`
- `TesterIntegrated` - a native tester application that integrates the native projects with and React Native project inside a single application, consuming the brownfield module directly, without packaging to an artifact; this is mostly useful for internal development purposes and is not as meaningful for end users of React Native Brownfield
