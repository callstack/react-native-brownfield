# Changelog

_History prior to 3.7.0 is available in the per-package CHANGELOG files._

## 3.10.0

### Minor Changes

- [#323](https://github.com/callstack/react-native-brownfield/pull/323) [`3456d3a`](https://github.com/callstack/react-native-brownfield/commit/3456d3aded18002475def4b79889979e76e1db5e) Thanks [@artus9033](https://github.com/artus9033)! - Support RN prebuilts in Brownfield, by default enabled in RN >= 0.84, opt-in in RN 0.83; or in Expo 55+ (Expo 54 is not supported).
  Add `--use-prebuilt-rn-core` to `brownfield package:ios` so callers can opt into or out of React Native Apple prebuilt binaries; omitting the flag defers to version-aware defaults handled by Rock. The CLI rejects `--use-prebuilt-rn-core` when React Native is older than 0.81 or when the project is Expo SDK older than 55.

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

