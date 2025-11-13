This section provides a troubleshooting guide for common issues encountered when using the `react-native-brownfield` library. If you face any problems not covered here, please refer to the official documentation or reach out to the community for support.

## [Android] `Error: duplicate resources` during `:app:mergeReleaseAssets`

An error like `Error: duplicate resources` during the `:app:mergeReleaseAssets` phase may occur if you have upgraded your React Native version from a version less than `0.82.0`, to a version greater than or equal to (>=) `0.82.0`. This is because RN 0.82.0 changed the path to which the JS bundle is written to from `build/generated/assets/createBundleReleaseJsAndAssets/` to `build/generated/assets/react/release/`, and analogously changed the path for `res/createBundleReleaseJsAndAssets/`. The brownfield Gradle plugin adds both directories to the source sets, potentially causing a conflict of artifacts. To fix this, just once clean your build directory (precisely, the `app/build/` directory) and rebuild the project. All subsequent builds should work fine.

## [iOS] `No script URL provided` in Release configuration

If you encounter this error, most likely you have missed a setup step and are missing `ReactNativeBrownfield.shared.bundle = ReactNativeBundle` before your call to `startReactNative`.
