# Changelog

_History prior to 3.7.0 is available in the per-package CHANGELOG files._

## 3.14.0

### Minor Changes

- [#360](https://github.com/callstack/react-native-brownfield/pull/360) [`10ff597`](https://github.com/callstack/react-native-brownfield/commit/10ff597c057c04aa093b4e5ae8c5334b169d3d56) Thanks [@adamTrz](https://github.com/adamTrz)! - Expo SDK 56 support

### Patch Changes

- Updated dependencies [[`10ff597`](https://github.com/callstack/react-native-brownfield/commit/10ff597c057c04aa093b4e5ae8c5334b169d3d56)]:
  - @callstack/brownfield-cli@3.14.0

## 3.13.2

### Patch Changes

- Updated dependencies [[`8e90842`](https://github.com/callstack/react-native-brownfield/commit/8e90842291348dcb0542a6787f5cfbb1017532dd), [`3475c3d`](https://github.com/callstack/react-native-brownfield/commit/3475c3db375988ebd63ce01bfd93f4dbb1a55e8d), [`4088c01`](https://github.com/callstack/react-native-brownfield/commit/4088c01a069306565dd3e279d9132f5dbe861d0b)]:
  - @callstack/brownfield-cli@3.13.2

- [#398](https://github.com/callstack/react-native-brownfield/pull/398) [`8e90842`](https://github.com/callstack/react-native-brownfield/commit/8e90842291348dcb0542a6787f5cfbb1017532dd) Thanks [@artus9033](https://github.com/artus9033)! - feat: support brownfield unified config file in Expo

- [#402](https://github.com/callstack/react-native-brownfield/pull/402) [`3475c3d`](https://github.com/callstack/react-native-brownfield/commit/3475c3db375988ebd63ce01bfd93f4dbb1a55e8d) Thanks [@artus9033](https://github.com/artus9033)! - feat: support local BGP in Expo config plugin

- [#397](https://github.com/callstack/react-native-brownfield/pull/397) [`4088c01`](https://github.com/callstack/react-native-brownfield/commit/4088c01a069306565dd3e279d9132f5dbe861d0b) Thanks [@artus9033](https://github.com/artus9033)! - fix: generate config schema with descriptions, add more descriptions

- [#401](https://github.com/callstack/react-native-brownfield/pull/401) [`c4410f6`](https://github.com/callstack/react-native-brownfield/commit/c4410f6af4c781cf3513ba55d03fa1b1055a443b) Thanks [@artus9033](https://github.com/artus9033)! - fix: brownfield Gradle Plugin not to depend on \*UpdatesResources task from expo-updates if it is absent

## 3.13.1

### Patch Changes

- Updated dependencies [[`89bc23c`](https://github.com/callstack/react-native-brownfield/commit/89bc23c00bb85c036fce6d4ea142fb3ba0846deb)]:
  - @callstack/brownfield-cli@3.13.1

- [#394](https://github.com/callstack/react-native-brownfield/pull/394) [`89bc23c`](https://github.com/callstack/react-native-brownfield/commit/89bc23c00bb85c036fce6d4ea142fb3ba0846deb) Thanks [@Esemesek](https://github.com/Esemesek)! - Fix schema.json not being released

## 3.13.0

### Minor Changes

- [#352](https://github.com/callstack/react-native-brownfield/pull/352) [`b451bb1`](https://github.com/callstack/react-native-brownfield/commit/b451bb18dffe3974e39537cc0c023ef634ff3152) Thanks [@alpharius-ck](https://github.com/alpharius-ck)! - e2e tests

- [#339](https://github.com/callstack/react-native-brownfield/pull/339) [`ef835b5`](https://github.com/callstack/react-native-brownfield/commit/ef835b52a130e4cd8770a2db04402cbb066b9c27) Thanks [@Esemesek](https://github.com/Esemesek)! - Added configuration file support for react-native-brownfield packages.

- [#359](https://github.com/callstack/react-native-brownfield/pull/359) [`533569b`](https://github.com/callstack/react-native-brownfield/commit/533569b59a4981669dfb738295b505343623bc32) Thanks [@MrMuzyk](https://github.com/MrMuzyk)! - Expose the Brownfield Android Gradle Plugin source from the npm package for opt-in local patching.

### Patch Changes

- Updated dependencies [[`ef835b5`](https://github.com/callstack/react-native-brownfield/commit/ef835b52a130e4cd8770a2db04402cbb066b9c27)]:
  - @callstack/brownfield-cli@3.13.0

- [#391](https://github.com/callstack/react-native-brownfield/pull/391) [`95dbb43`](https://github.com/callstack/react-native-brownfield/commit/95dbb434d4c526b8f75bfd4c54b1d023e349ccf4) Thanks [@adamTrz](https://github.com/adamTrz)! - Fix Expo iOS framework debug bundle packaging so Debug builds load from Metro when it is available and fall back to embedded bundles without dev-server-only runtime code.

## 3.12.0

### Minor Changes

- [#237](https://github.com/callstack/react-native-brownfield/pull/237) [`4186cc8`](https://github.com/callstack/react-native-brownfield/commit/4186cc8e2ed2fa7aa41e84cdba7a23f7035ee08d) Thanks [@hurali97](https://github.com/hurali97)! - Bump brownfield-gradle-plugin

### Patch Changes

- Updated dependencies []:
  - @callstack/brownfield-cli@3.12.0

## 3.11.0

### Minor Changes

- [#358](https://github.com/callstack/react-native-brownfield/pull/358) [`3715ac7`](https://github.com/callstack/react-native-brownfield/commit/3715ac7783000756ef1c66ecfe24a85c5e43abab) Thanks [@adamTrz](https://github.com/adamTrz)! - Add `--add-spm-package` to `brownfield package:ios` so packaging can also generate a local Swift Package Manager wrapper around the produced XCFrameworks, including a generated `Package.swift`, `README.md`, and Xcode integration instructions. Fail fast when Debug packaging cannot resolve the app framework name while local SPM output is requested.

- [#364](https://github.com/callstack/react-native-brownfield/pull/364) [`05c557d`](https://github.com/callstack/react-native-brownfield/commit/05c557da9e2b6fca02e6e1a0b0fe71a909bab15f) Thanks [@hurali97](https://github.com/hurali97)! - keep only one reference of xcframeworks when spm enabled

- [#317](https://github.com/callstack/react-native-brownfield/pull/317) [`c04301b`](https://github.com/callstack/react-native-brownfield/commit/c04301b79d288ab108aaa44d7c79dd876b8405e9) Thanks [@adamTrz](https://github.com/adamTrz)! - Add an opt-in iOS Debug mode for loading the embedded JavaScript bundle with `preferEmbeddedBundleInDebug`, fix `bundleURLOverride` fallback behavior when the override returns `nil`, and add native bundle-resolution tests.

### Patch Changes

- Updated dependencies [[`3715ac7`](https://github.com/callstack/react-native-brownfield/commit/3715ac7783000756ef1c66ecfe24a85c5e43abab), [`05c557d`](https://github.com/callstack/react-native-brownfield/commit/05c557da9e2b6fca02e6e1a0b0fe71a909bab15f)]:
  - @callstack/brownfield-cli@3.11.0

- [#353](https://github.com/callstack/react-native-brownfield/pull/353) [`7955c62`](https://github.com/callstack/react-native-brownfield/commit/7955c62a6aca06174efee48e80ac14f78312c797) Thanks [@marcinszalski-callstack](https://github.com/marcinszalski-callstack)! - fix: call copyStrippedSoLibs once after the loop to avoid redundant SO file copying

- [#361](https://github.com/callstack/react-native-brownfield/pull/361) [`aa14eb2`](https://github.com/callstack/react-native-brownfield/commit/aa14eb26e26ea1e6075b91027237e4b41b932b57) Thanks [@hurali97](https://github.com/hurali97)! - make EXUpdates as a dependency only when installed

- [#347](https://github.com/callstack/react-native-brownfield/pull/347) [`c19a81b`](https://github.com/callstack/react-native-brownfield/commit/c19a81b7502cc458d742ab947186591bb69cb261) Thanks [@marcinszalski-callstack](https://github.com/marcinszalski-callstack)! - fix: fix method to deallocate reactNativeFactory instance for expo

## 3.10.0

### Minor Changes

- [#323](https://github.com/callstack/react-native-brownfield/pull/323) [`3456d3a`](https://github.com/callstack/react-native-brownfield/commit/3456d3aded18002475def4b79889979e76e1db5e) Thanks [@artus9033](https://github.com/artus9033)! - Support RN prebuilts in Brownfield, by default enabled in RN >= 0.84, opt-in in RN 0.83; or in Expo 55+ (Expo 54 is not supported).
  Add `--use-prebuilt-rn-core` to `brownfield package:ios` so callers can opt into or out of React Native Apple prebuilt binaries; omitting the flag defers to version-aware defaults handled by Rock. The CLI rejects `--use-prebuilt-rn-core` when React Native is older than 0.81 or when the project is Expo SDK older than 55.
  Fix brownfield framework dylib install names to use @rpath instead of hardcoded paths.

### Patch Changes

- Updated dependencies [[`3456d3a`](https://github.com/callstack/react-native-brownfield/commit/3456d3aded18002475def4b79889979e76e1db5e)]:
  - @callstack/brownfield-cli@3.10.0

- [#323](https://github.com/callstack/react-native-brownfield/pull/323) [`3456d3a`](https://github.com/callstack/react-native-brownfield/commit/3456d3aded18002475def4b79889979e76e1db5e) Thanks [@artus9033](https://github.com/artus9033)! - Force `BUILD_LIBRARY_FOR_DISTRIBUTION` / `SWIFT_EMIT_MODULE_INTERFACE` on the CocoaPods ReactBrownfield, Brownie and BrownfieldNavigation targets so Release builds emit `.swiftinterface` files and `xcodebuild -create-xcframework` (brownfield `package:ios`) can merge slices.

## 3.9.0

### Minor Changes

- [#326](https://github.com/callstack/react-native-brownfield/pull/326) [`80e6364`](https://github.com/callstack/react-native-brownfield/commit/80e6364d405d216b3e84a6297dfe346d2f01444b) Thanks [@artus9033](https://github.com/artus9033)! - feat: strip SO files by default, deprecate experimental option in favor of useStrippedSoFiles

### Patch Changes

- Updated dependencies [[`80e6364`](https://github.com/callstack/react-native-brownfield/commit/80e6364d405d216b3e84a6297dfe346d2f01444b)]:
  - @callstack/brownfield-cli@3.9.0

## 3.8.1

### Patch Changes

- [#336](https://github.com/callstack/react-native-brownfield/pull/336) [`35b6f0a`](https://github.com/callstack/react-native-brownfield/commit/35b6f0aebd51a86165fe8af1890ccc3bd5189aaa) Thanks [@hurali97](https://github.com/hurali97)! - fix: allow unregistering the navigation delegate

- Updated dependencies [[`e78084d`](https://github.com/callstack/react-native-brownfield/commit/e78084d227a49d39d726b8c778bd56045634678d)]:
  - @callstack/brownfield-cli@3.8.1

- [#335](https://github.com/callstack/react-native-brownfield/pull/335) [`e78084d`](https://github.com/callstack/react-native-brownfield/commit/e78084d227a49d39d726b8c778bd56045634678d) Thanks [@hurali97](https://github.com/hurali97)! - fix: Object params correctly reflect the generated native code instead of Any

## 3.8.0

### Minor Changes

- [#295](https://github.com/callstack/react-native-brownfield/pull/295) [`d93dcd9`](https://github.com/callstack/react-native-brownfield/commit/d93dcd96e3b90517d718cd42b2cc773fb9795eac) Thanks [@hurali97](https://github.com/hurali97)! - add expo updates support

### Patch Changes

- Updated dependencies [[`d93dcd9`](https://github.com/callstack/react-native-brownfield/commit/d93dcd96e3b90517d718cd42b2cc773fb9795eac)]:
  - @callstack/brownfield-cli@3.8.0

## 3.7.0

### Minor Changes

- [#313](https://github.com/callstack/react-native-brownfield/pull/313) [`c153378`](https://github.com/callstack/react-native-brownfield/commit/c1533783c0a93372b3c12f08c1428766c0405226) Thanks [@alpharius-ck](https://github.com/alpharius-ck)! - Jest unit tests

### Patch Changes

- [#322](https://github.com/callstack/react-native-brownfield/pull/322) [`cbc99cf`](https://github.com/callstack/react-native-brownfield/commit/cbc99cf2bbbb8ba351a2bde3c839dd1b5dcf302b) Thanks [@marcinszalski-callstack](https://github.com/marcinszalski-callstack)! - fix: make sure android libs are loaded for expo apps

- Updated dependencies [[`c153378`](https://github.com/callstack/react-native-brownfield/commit/c1533783c0a93372b3c12f08c1428766c0405226)]:
  - @callstack/brownfield-cli@3.7.0

- [#315](https://github.com/callstack/react-native-brownfield/pull/315) [`874332b`](https://github.com/callstack/react-native-brownfield/commit/874332b8a4cc58e945adad64cbaebfbe4d6cae88) Thanks [@marcinszalski-callstack](https://github.com/marcinszalski-callstack)! - fix: make sure native libs are loaded for RN >= 0.80

