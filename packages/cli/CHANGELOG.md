# @callstack/brownfield-cli

## 3.10.0

### Minor Changes

- [#323](https://github.com/callstack/react-native-brownfield/pull/323) [`3456d3a`](https://github.com/callstack/react-native-brownfield/commit/3456d3aded18002475def4b79889979e76e1db5e) Thanks [@artus9033](https://github.com/artus9033)! - Support RN prebuilts in Brownfield, by default enabled in RN >= 0.84, opt-in in RN 0.83; or in Expo 55+ (Expo 54 is not supported).

  Add `--use-prebuilt-rn-core` to `brownfield package:ios` so callers can opt into or out of React Native Apple prebuilt binaries; omitting the flag defers to version-aware defaults handled by Rock. The CLI rejects `--use-prebuilt-rn-core` when React Native is older than 0.81 or when the project is Expo SDK older than 55.

  Fix brownfield framework dylib install names to use @rpath instead of hardcoded paths.

## 3.9.0

### Minor Changes

- [#326](https://github.com/callstack/react-native-brownfield/pull/326) [`80e6364`](https://github.com/callstack/react-native-brownfield/commit/80e6364d405d216b3e84a6297dfe346d2f01444b) Thanks [@artus9033](https://github.com/artus9033)! - feat: strip SO files by default, deprecate experimental option in favor of useStrippedSoFiles

## 3.8.1

### Patch Changes

- [#335](https://github.com/callstack/react-native-brownfield/pull/335) [`e78084d`](https://github.com/callstack/react-native-brownfield/commit/e78084d227a49d39d726b8c778bd56045634678d) Thanks [@hurali97](https://github.com/hurali97)! - fix: Object params correctly reflect the generated native code instead of Any

## 3.8.0

### Minor Changes

- [#295](https://github.com/callstack/react-native-brownfield/pull/295) [`d93dcd9`](https://github.com/callstack/react-native-brownfield/commit/d93dcd96e3b90517d718cd42b2cc773fb9795eac) Thanks [@hurali97](https://github.com/hurali97)! - add expo updates support

## 3.7.0

### Minor Changes

- [#313](https://github.com/callstack/react-native-brownfield/pull/313) [`c153378`](https://github.com/callstack/react-native-brownfield/commit/c1533783c0a93372b3c12f08c1428766c0405226) Thanks [@alpharius-ck](https://github.com/alpharius-ck)! - Jest unit tests

## 3.6.1

### Patch Changes

- [#305](https://github.com/callstack/react-native-brownfield/pull/305) [`eab53d9`](https://github.com/callstack/react-native-brownfield/commit/eab53d9f7b93f38e13185020fcf8a7af23df0d05) Thanks [@hurali97](https://github.com/hurali97)! - fix securiy vulnerabilities

## 3.6.0

### Patch Changes

- [#296](https://github.com/callstack/react-native-brownfield/pull/296) [`5ac357b`](https://github.com/callstack/react-native-brownfield/commit/5ac357bb8802ecf3562d92be191f6681ae94a055) Thanks [@hurali97](https://github.com/hurali97)! - fix duplicate symbols for react-brownfield

## 3.5.1

## 3.5.0

### Minor Changes

- [#257](https://github.com/callstack/react-native-brownfield/pull/257) [`d0e6203`](https://github.com/callstack/react-native-brownfield/commit/d0e62039c8a080c648abbbeace047e72fadce28b) Thanks [@hurali97](https://github.com/hurali97)! - add brownie android

## 3.4.0

### Patch Changes

- [#246](https://github.com/callstack/react-native-brownfield/pull/246) [`5484065`](https://github.com/callstack/react-native-brownfield/commit/5484065da9dc86a420af2be692fcdefa32fbb2af) Thanks [@artus9033](https://github.com/artus9033)! - chore: upgrade dependencies

- [#275](https://github.com/callstack/react-native-brownfield/pull/275) [`dd8b8a0`](https://github.com/callstack/react-native-brownfield/commit/dd8b8a0b532fe779c1f2ce018577ad748b887ee0) Thanks [@artus9033](https://github.com/artus9033)! - chore: bump up Gradle plugin version

- [#271](https://github.com/callstack/react-native-brownfield/pull/271) [`54ab7ab`](https://github.com/callstack/react-native-brownfield/commit/54ab7ab01bd6f95439cc8b702d4124552e22ad55) Thanks [@artus9033](https://github.com/artus9033)! - feat: improved logging in brownfield CLI codegens

- [#246](https://github.com/callstack/react-native-brownfield/pull/246) [`5484065`](https://github.com/callstack/react-native-brownfield/commit/5484065da9dc86a420af2be692fcdefa32fbb2af) Thanks [@artus9033](https://github.com/artus9033)! - chore: upgrade dependencies

## 3.3.0

### Minor Changes

- [#248](https://github.com/callstack/react-native-brownfield/pull/248) [`b0a6f41`](https://github.com/callstack/react-native-brownfield/commit/b0a6f4185aad4e8759b90ccaf9867be493a979ec) Thanks [@artus9033](https://github.com/artus9033)! - feat: support Expo 55

## 3.2.1

### Patch Changes

- [#265](https://github.com/callstack/react-native-brownfield/pull/265) [`7e114e6`](https://github.com/callstack/react-native-brownfield/commit/7e114e676fc290a54912b4d99bd22952b2f7380d) Thanks [@hurali97](https://github.com/hurali97)! - version bump

## 3.2.0

### Minor Changes

- [#263](https://github.com/callstack/react-native-brownfield/pull/263) [`b7dfa7e`](https://github.com/callstack/react-native-brownfield/commit/b7dfa7e30e1a921bb7ac0952e23481ee081fb9ed) Thanks [@hurali97](https://github.com/hurali97)! - version bump for release

## 3.1.0

### Minor Changes

- [#236](https://github.com/callstack/react-native-brownfield/pull/236) [`3e33b89`](https://github.com/callstack/react-native-brownfield/commit/3e33b890e6f647f6bbebe32f8068a38b1ed85ea0) Thanks [@hurali97](https://github.com/hurali97)! - add brownfield navigation

## 3.0.0

### Patch Changes

- [#255](https://github.com/callstack/react-native-brownfield/pull/255) [`48358b2`](https://github.com/callstack/react-native-brownfield/commit/48358b2dcce578aa5052e66cc3454524da8c7992) Thanks [@artus9033](https://github.com/artus9033)! - chore: release stable v3

## 1.0.4

### Patch Changes

- [#216](https://github.com/callstack/react-native-brownfield/pull/216) [`8ce3ea1`](https://github.com/callstack/react-native-brownfield/commit/8ce3ea10e0719adac7396dea8f171753e901b31d) Thanks [@thymikee](https://github.com/thymikee)! - chore: remove release-it

## 1.0.3

### Patch Changes

- [#213](https://github.com/callstack/react-native-brownfield/pull/213) [`2347775`](https://github.com/callstack/react-native-brownfield/commit/23477753b16ee189b82c1aee3eac98a56c79f52a) Thanks [@thymikee](https://github.com/thymikee)! - feat: create brownfield package as CLI proxy

## 1.0.2

### Patch Changes

- [`2a8563f`](https://github.com/callstack/react-native-brownfield/commit/2a8563f65ed152054ad1290caf963791a368ee9a) Thanks [@okwasniewski](https://github.com/okwasniewski)! - feat: strip framework binaries to avoid duplicate symbol errors

## 1.0.1

### Patch Changes

- [#198](https://github.com/callstack/react-native-brownfield/pull/198) [`c8c903d`](https://github.com/callstack/react-native-brownfield/commit/c8c903d0d2b78a8c06a41213dfbe781a2daf3d25) Thanks [@artus9033](https://github.com/artus9033)! - docs: added README files to all packages
