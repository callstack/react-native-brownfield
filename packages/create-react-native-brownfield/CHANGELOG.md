# @callstack/create-react-native-brownfield

## 6.0.2

### Patch Changes

- Updated dependencies [[`6a258da`](https://github.com/callstack/react-native-brownfield/commit/6a258da42f2bd2cbb112f56948108323aeba74d9)]:
  - @callstack/react-native-brownfield@6.0.2

## 6.0.1

### Patch Changes

- [#487](https://github.com/callstack/react-native-brownfield/pull/487) [`79817d1`](https://github.com/callstack/react-native-brownfield/commit/79817d1a21b0cb28ae63d41e935c57af8e7db39f) Thanks [@KisaneNeko](https://github.com/KisaneNeko)! - Support Expo modules in React Native CLI apps. `brownfield package:*` no longer runs `expo prebuild` on projects with committed `android/` and `ios/` directories, which used to delete the brownfield library module. Prebuild now runs only when the native directory is missing or gitignored. If you commit the generated directories of an Expo app, run `npx expo prebuild` yourself after changing `app.json` or config plugins. `create-react-native-brownfield` now detects Expo and sets up the iOS framework to use the Expo runtime. On a re-run after adding Expo, it also raises an existing framework target to iOS 16.4.

  `--use-prebuilt-expo` now also turns Expo's precompiled modules on or off for `pod install`, and turns on Swift explicit modules so packaging works in projects that still carry the old `SWIFT_ENABLE_EXPLICIT_MODULES = NO` workaround. It defaults to building Expo from source when the app's React Native version doesn't match the one Expo's precompiled modules were built for.

  `package:ios` now copies the expo-image dependency XCFrameworks (SDWebImage and libavif) as real files instead of symlinks into `node_modules`, so the package works when moved to another machine.

  Re-running `create-react-native-brownfield` after `pod install` no longer adds a second Sources build phase to the framework target, which made the next `pod install` fail.

  The `package:ios` script that `create-react-native-brownfield` adds now passes `--add-spm-package`, so the iOS app adds one local Swift package instead of every XCFramework. Existing scripts aren't changed.

- Updated dependencies [[`79817d1`](https://github.com/callstack/react-native-brownfield/commit/79817d1a21b0cb28ae63d41e935c57af8e7db39f), [`7e63e20`](https://github.com/callstack/react-native-brownfield/commit/7e63e204c449ab36ce5b109ff3eb5db086260089), [`3b38aeb`](https://github.com/callstack/react-native-brownfield/commit/3b38aebb63810a8d1cc686bd70cccdeb279bf119), [`0f62490`](https://github.com/callstack/react-native-brownfield/commit/0f62490e7602d1aad56ee5d9eba2fd667dc0171a)]:
  - @callstack/react-native-brownfield@6.0.1

## 6.0.0

### Patch Changes

- Updated dependencies [[`d28810c`](https://github.com/callstack/react-native-brownfield/commit/d28810caa32f727d56915d8e8d9276a82560b231)]:
  - @callstack/react-native-brownfield@6.0.0

## 5.3.0

### Minor Changes

- [#480](https://github.com/callstack/react-native-brownfield/pull/480) [`f17f556`](https://github.com/callstack/react-native-brownfield/commit/f17f55616615a2bcb82d90f358efd838f56f5e67) Thanks [@gedu](https://github.com/gedu)! - add @callstack/create-react-native-brownfield: scaffold Brownfield packaging targets in an existing React Native CLI project (`npm create @callstack/react-native-brownfield`), plus the `@callstack/react-native-brownfield/scaffold` subpath export it uses

### Patch Changes

- Updated dependencies [[`f17f556`](https://github.com/callstack/react-native-brownfield/commit/f17f55616615a2bcb82d90f358efd838f56f5e67)]:
  - @callstack/react-native-brownfield@5.3.0
