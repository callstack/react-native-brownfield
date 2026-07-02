# Contributing to React Native Brownfield

## Project setup

Run `yarn` in the root of the repository to install all dependencies.

Depending on your needs, you may need to install CocoaPods in the example React Native iOS app: `cd apps/RNApp/ios && pod install`.

## Contributing changes

After contributing your changes, please make sure to add a [changeset](https://github.com/changesets/changesets) describing your changes. This will help us in publishing new versions.

### Pre-commit guard for brownfield-navigation

This is a monorepo and the files inside `@callstack/brownfield-navigation` are auto-generated whenever `brownfield:package:*` is run. This is a desired behavior for the end user as these files will be inside the `node_modules`. However, since in this repo this package is symlinked, we see the changes in our git tree.

These should not be committed by accident. A `pre-commit` guard blocks commits when those generated files are staged.

If you need to intentionally commit those files (for an explicit update), bypass the guard for that commit:

`SKIP_BROWNFIELD_NAVIGATION_CHECK=1 git commit -m "..."`

## Publishing to npm

We use [changesets](https://github.com/changesets/changesets) to make it easier to publish new versions. It handles common tasks like bumping version based on semver, creating tags and releases etc.

## Scripts

- `lint` - runs linting on all JS/TS source files in the monorepo _[Turbo]_
- `gradle-plugin:lint` - runs linting on the Brownfield Gradle plugin source code
- `typecheck` - runs TypeScript type checking on all TS source files in the monorepo _[Turbo]_
- `test:apps` - runs Jest for the React Native example apps under `apps/` (Expo 55, plain RN) _[Turbo]_
- `build` - runs all `build*` tasks in the Turbo repo - see below for more details _[Turbo]_
- `dev` - runs all `dev` tasks in all workspaces
- `brownfield:plugin:publish:local` - publishes the Brownfield Gradle plugin to your local Maven repository for testing purposes
- `build:brownfield` - builds the React Native Brownfield package (`packages/react-native-brownfield`) _[Turbo]_
- `build:docs` - builds the documentation site (`docs/`) _[Turbo]_
- `build:example:android-rn` - builds the example React Native app for Android (`apps/RNApp/android`)
- `build:example:ios-rn` - builds the example React Native app for iOS (`apps/RNApp/ios`)
- `build:example:android-consumer:expo55` - builds the example native Android consumer (`apps/AndroidApp`) app's flavor consuming the Expo 55 RN app (`apps/ExpoApp55`) artifact
- `build:example:android-consumer:vanilla` - builds the example native Android consumer (`apps/AndroidApp`) app's flavor consuming the vanilla RN app (`apps/RNApp`) artifact
- `build:example:ios-consumer:expo` - alias for `build:example:ios-consumer:expo55`
- `build:example:ios-consumer:expo55` - builds the `Brownfield Apple App (ExpoApp55)` target via scheme **Brownfield Apple App Expo 55** (`Release`)
- `build:example:ios-consumer:vanilla` - builds the `Brownfield Apple App (RNApp)` target via scheme **Brownfield Apple App Vanilla** (`Release Vanilla`)

## Running demo apps

Each of the apps in `apps/` provides scripts for running them. You can run them either standalone, or package for brownfield.

### Standalone run

Each of the apps can be run standalone, by running `yarn ios` or `yarn android`.

### Packaging for brownfield

To package an application for brownfield, you can run `yarn brownfield:package:ios` or `yarn brownfield:publish:android`.

### Running a brownfield host app

There are 2 brownfield host apps.

> [!IMPORTANT]
> Each of the scripts below requires you to **first** package the consumed RN application with `yarn brownfield:package:ios`, e.g. `cd apps/ExpoApp55 && yarn brownfield:package:ios`.

- `apps/AndroidApp` - for Android
  - `build:example:android-consumer:expo55` - consumes Expo 55
  - `build:example:android-consumer:vanilla` - consumes the vanilla `RNApp`
- `apps/AppleApp` - for Apple (two Xcode targets, each with its own shared scheme)
  - `build:example:ios-consumer:expo55` (or `expo`) — target `Brownfield Apple App (ExpoApp55)`, scheme **Brownfield Apple App Expo 55**
  - `build:example:ios-consumer:vanilla` — target `Brownfield Apple App (RNApp)`, scheme **Brownfield Apple App Vanilla**

For iOS, these scripts validate the legacy direct-XCFramework integration path. Each script uses the previously packaged artifacts from the respective directory (`apps/RNApp` or `apps/ExpoApp55`), invokes `prepareXCFrameworks.js` to copy XCFrameworks into `apps/AppleApp/package`, then runs `xcodebuild` against the matching scheme. The Xcode project reads fixed paths under `package/` (for example `package/BrownfieldLib.xcframework`).

| Yarn script                          | RN app      | Xcode target                       | Scheme                       | Configuration     |
| ------------------------------------ | ----------- | ---------------------------------- | ---------------------------- | ----------------- |
| `build:example:ios-consumer:vanilla` | `RNApp`     | `Brownfield Apple App (RNApp)`     | Brownfield Apple App Vanilla | `Release Vanilla` |
| `build:example:ios-consumer:expo55`  | `ExpoApp55` | `Brownfield Apple App (ExpoApp55)` | Brownfield Apple App Expo 55 | `Release`         |

> [!IMPORTANT]
> You can build and run `AppleApp` from the Xcode GUI by selecting the scheme for the variant you want. Before running, after switching schemes or re-packaging an RN app, run the matching `build:example:ios-consumer:...` script so fresh artifacts are present in `apps/AppleApp/package`. Otherwise Xcode will still link against the previous XCFrameworks.

### Running `AppleApp` with local SPM

The local Swift Package Manager flow is separate from `prepareXCFrameworks.js`. Instead of copying artifacts into `apps/AppleApp/package`, generate a local package next to the packaged RN app and add that package in Xcode.

1. Package the producer app with `--add-spm-package`, for example:
   - `cd apps/RNApp && yarn exec brownfield package:ios --scheme BrownfieldLib --configuration Release --add-spm-package`
   - `cd apps/ExpoApp55 && yarn exec brownfield package:ios --scheme BrownfieldLib --configuration Release --add-spm-package`
2. Open `apps/AppleApp/Brownfield Apple App.xcodeproj`.
3. Select the host scheme you want to validate:
   - `Brownfield Apple App Vanilla`
   - `Brownfield Apple App Expo 55`
4. In Xcode, go to `Package Dependencies`, click `+`, choose `Add Local...`, and select the generated package folder:
   - `apps/RNApp/ios/.brownfield/package/build`
   - `apps/ExpoApp55/ios/.brownfield/package/build`
5. Add the `BrownfieldLib` product to the matching AppleApp target.
6. Remove old direct `package/*.xcframework` references from that target if you are switching from the legacy direct-XCFramework path.

AppleApp now derives its native shell label from target build settings and uses the shared brownfield React Native entry point directly, so the local SPM flow does not require `prepareXCFrameworks.js` to rewrite Swift source files before you build.

## Tests

The React Native example apps share Jest utilities and test suites from `apps/brownfield-example-shared-tests`. Tests exercise integration with `@callstack/react-native-brownfield`, `@callstack/brownfield-navigation`, and `@callstack/brownie` as used in each demo.

From the repository root:

| Command          | Description                                                             |
| ---------------- | ----------------------------------------------------------------------- |
| `yarn test:apps` | Runs `test` in all workspaces under `apps/` that define it (via Turbo). |

Per example app (run from the repo root):

| Command                                                         | App                               |
| --------------------------------------------------------------- | --------------------------------- |
| `yarn workspace @callstack/brownfield-example-rn-app test`      | Plain React Native (`apps/RNApp`) |
| `yarn workspace @callstack/brownfield-example-expo-app-55 test` | Expo SDK 55 (`apps/ExpoApp55`)    |

Package-level scripts (`yarn test` inside `apps/RNApp` or `apps/ExpoApp55`) invoke Jest with each app’s `jest.config.js`.

The native-only sample apps (`apps/AppleApp`, `apps/AndroidApp`) use their platform test runners (Xcode / Gradle), not Jest.

## E2E tests (Detox)

End-to-end tests use [Detox](https://wix.github.io/Detox/) on the iOS Simulator. Shared specs and helpers live in `apps/brownfield-example-shared-tests/e2e/`; each app wires them through its own `.detoxrc.cjs` and `e2e/jest.config.cjs`.

E2E runs without Metro: the Debug simulator build embeds `main.jsbundle` (`FORCE_BUNDLING=1`) so the app loads JS from the binary, matching CI.

### Two integration paths

| Path                                            | What it exercises                                                | Typical flow                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| RN host app (`RNApp`, `ExpoApp55`) | Brownfield RN app running as the simulator target                | `expo prebuild` / pods → Detox build → Detox test                                               |
| native host app (`AppleApp`)                    | Native host app consuming a packaged `BrownfieldLib` XCFramework | `brownfield:package:ios` → copy XCFrameworks into `AppleApp/package` → Detox build → Detox test |

Per-app Detox scripts (run from the app directory):

| App                       | Build                       | Test                       | Shared spec                        |
| ------------------------- | --------------------------- | -------------------------- | ---------------------------------- |
| `RNApp`                   | `yarn e2e:build:ios`        | `yarn e2e:test:ios`        | `rnAppBrownfield.e2e.js`           |
| `ExpoApp55`               | `yarn e2e:build:ios`        | `yarn e2e:test:ios`        | `expoPostMessageBrownfield.e2e.js` |
| `AppleApp` (vanilla)      | `yarn e2e:build:ios`        | `yarn e2e:test:ios`        | `appleAppBrownfield.e2e.js`        |
| `AppleApp` (Expo 55)      | `yarn e2e:build:ios:expo55` | `yarn e2e:test:ios:expo55` | `appleAppExpoBrownfield.e2e.js`    |

### CI

iOS Detox E2E runs in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) via [`.github/actions/appleapp-road-test`](.github/actions/appleapp-road-test/action.yml):

| Job                           | E2E | Notes                                    |
| ----------------------------- | --- | ---------------------------------------- |
| `ios-appleapp-vanilla`        | Yes | `RNApp` → package → `AppleApp` Detox     |
| `ios-appleapp-expo` (Expo 55) | Yes | `ExpoApp55` → package → `AppleApp` Detox |

On failure, CI uploads `apps/AppleApp/e2e-artifacts/` as a workflow artifact (`detox-appleapp-*-ios-recordings`).

Direct host-app E2E is local-only — use the `ci:local:*` scripts below to reproduce CI-like setup on macOS.

### Local CI scripts

From the repo root (macOS + Xcode + Simulator required). All wrap `scripts/ci-local-ios-e2e-common.sh` and accept the same flags:

| Command                                 | Mirrors                          |
| --------------------------------------- | -------------------------------- |
| `yarn ci:local:rnapp:e2e:ios`           | RN host app E2E (`apps/RNApp`)   |
| `yarn ci:local:expo55:e2e:ios`          | Expo 55 host app E2E             |
| `yarn ci:local:appleapp:e2e:ios`        | CI `ios-appleapp-vanilla`        |
| `yarn ci:local:appleapp:e2e:ios:expo55` | CI `ios-appleapp-expo` (Expo 55) |

Common flags (append to any command above):

| Flag             | Effect                                                 |
| ---------------- | ------------------------------------------------------ |
| `--clean-ios`    | Remove `ios/Pods` and `ios/build` before setup         |
| `--skip-install` | Skip root `yarn install` / `yarn build`                |
| `--rebuild`      | Detox build + test only (skip install, prebuild, pods) |
| `--test-only`    | Run tests against an existing build (no rebuild)       |
| `--build-only`   | Detox build only, skip tests                           |

Host-app scripts run `yarn install`, `yarn build`, brownfield codegen, `expo prebuild`, `pod install`, Detox postinstall, then `e2e:build:ios` and `e2e:test:ios`. The AppleApp script packages the RN app and copies XCFrameworks first (same as CI).

### `e2e-artifacts/`

Detox writes failure diagnostics under `<app>/e2e-artifacts/` (configured in `apps/brownfield-example-shared-tests/detox-artifacts-config.cjs`). Each run creates a timestamped subfolder, e.g. `e2e-artifacts/ios.sim.debug.<TIMESTAMP>/`.
