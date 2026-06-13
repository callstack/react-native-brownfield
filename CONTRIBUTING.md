# Contributing to React Native Brownfield

## Project setup

Run `yarn` in the root of the repository to install all dependencies.

Depending on your needs, you may need to install CocoaPods in the example React Native iOS app: `cd apps/RNApp/ios && pod install`.

## Contributing changes

After contributing your changes, please make sure to add a [changeset](https://github.com/changesets/changesets) describing your changes. This will help us in publishing new versions.

## Publishing to npm

We use [changesets](https://github.com/changesets/changesets) to make it easier to publish new versions. It handles common tasks like bumping version based on semver, creating tags and releases etc.

## Scripts

- `lint` - runs linting on all JS/TS source files in the monorepo _[Turbo]_
- `gradle-plugin:lint` - runs linting on the Brownfield Gradle plugin source code
- `typecheck` - runs TypeScript type checking on all TS source files in the monorepo _[Turbo]_
- `test:apps` - runs Jest for the React Native example apps under `apps/` (Expo 54, Expo 55, plain RN) _[Turbo]_
- `build` - runs all `build*` tasks in the Turbo repo - see below for more details _[Turbo]_
- `dev` - runs all `dev` tasks in all workspaces
- `brownfield:plugin:publish:local` - publishes the Brownfield Gradle plugin to your local Maven repository for testing purposes
- `build:brownfield` - builds the React Native Brownfield package (`packages/react-native-brownfield`) _[Turbo]_
- `build:docs` - builds the documentation site (`docs/`) _[Turbo]_
- `build:example:android-rn` - builds the example React Native app for Android (`apps/RNApp/android`)
- `build:example:ios-rn` - builds the example React Native app for iOS (`apps/RNApp/ios`)
- `build:example:android-consumer:expo55` - builds the example native Android consumer (`apps/AndroidApp`) app's flavor consuming the Expo 55 RN app (`apps/ExpoApp55`) artifact
- `build:example:android-consumer:expo54` - builds the example native Android consumer (`apps/AndroidApp`) app's flavor consuming the Expo 54 RN app (`apps/ExpoApp54`) artifact
- `build:example:android-consumer:vanilla` - builds the example native Android consumer (`apps/AndroidApp`) app's flavor consuming the vanilla RN app (`apps/RNApp`) artifact
- `build:example:ios-consumer:expo` - alias for `build:example:ios-consumer:expo55`
- `build:example:ios-consumer:expo55` - builds the `Brownfield Apple App (ExpoApp55)` target via scheme **Brownfield Apple App Expo 55** (`Release`)
- `build:example:ios-consumer:expo54` - builds the `Brownfield Apple App (ExpoApp54)` target via scheme **Brownfield Apple App Expo 54** (`Release`)
- `build:example:ios-consumer:vanilla` - builds the `Brownfield Apple App (RNApp)` target via scheme **Brownfield Apple App Vanilla** (`Release Vanilla`)
- `build:example:ios-consumer:rock` - builds the `Brownfield Apple App (Rock)` target via scheme **Brownfield Apple App Vanilla** (`Release Rock`)

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
  - `build:example:android-consumer:expo54` - consumes Expo 54
  - `build:example:android-consumer:expo55` - consumes Expo 55
  - `build:example:android-consumer:vanilla` - consumes the vanilla `RNApp`
- `apps/AppleApp` - for Apple (three Xcode targets, each with its own shared scheme)
  - `build:example:ios-consumer:expo54` — target `Brownfield Apple App (ExpoApp54)`, scheme **Brownfield Apple App Expo 54**
  - `build:example:ios-consumer:expo55` (or `expo`) — target `Brownfield Apple App (ExpoApp55)`, scheme **Brownfield Apple App Expo 55**
  - `build:example:ios-consumer:vanilla` — target `Brownfield Apple App (RNApp)`, scheme **Brownfield Apple App Vanilla**

For iOS, these scripts validate the legacy direct-XCFramework integration path. Each script uses the previously packaged artifacts from the respective directory (`apps/RNApp`, `apps/ExpoApp54`, or `apps/ExpoApp55`), invokes `prepareXCFrameworks.js` to copy XCFrameworks into `apps/AppleApp/package`, then runs `xcodebuild` against the matching scheme. The Xcode project reads fixed paths under `package/` (for example `package/BrownfieldLib.xcframework`).

| Yarn script | RN app | Xcode target | Scheme | Configuration |
| --- | --- | --- | --- | --- |
| `build:example:ios-consumer:vanilla` | `RNApp` | `Brownfield Apple App (RNApp)` | Brownfield Apple App Vanilla | `Release Vanilla` |
| `build:example:ios-consumer:expo54` | `ExpoApp54` | `Brownfield Apple App (ExpoApp54)` | Brownfield Apple App Expo 54 | `Release` |
| `build:example:ios-consumer:expo55` | `ExpoApp55` | `Brownfield Apple App (ExpoApp55)` | Brownfield Apple App Expo 55 | `Release` |

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
   - `Brownfield Apple App Expo 54`
   - `Brownfield Apple App Expo 55`
4. In Xcode, go to `Package Dependencies`, click `+`, choose `Add Local...`, and select the generated package folder:
   - `apps/RNApp/ios/.brownfield/package/build`
   - `apps/ExpoApp54/ios/.brownfield/package/build`
   - `apps/ExpoApp55/ios/.brownfield/package/build`
5. Add the `BrownfieldLib` product to the matching AppleApp target.
6. Remove old direct `package/*.xcframework` references from that target if you are switching from the legacy direct-XCFramework path.

AppleApp now derives its native shell label from target build settings and uses the shared brownfield React Native entry point directly, so the local SPM flow does not require `prepareXCFrameworks.js` to rewrite Swift source files before you build.

## Tests

The React Native example apps share Jest utilities and test suites from `apps/brownfield-example-shared-tests`. Tests exercise integration with `@callstack/react-native-brownfield`, `@callstack/brownfield-navigation`, and `@callstack/brownie` as used in each demo.

From the repository root:

| Command | Description |
| --- | --- |
| `yarn test:apps` | Runs `test` in all workspaces under `apps/` that define it (via Turbo). |

Per example app (run from the repo root):

| Command | App |
| --- | --- |
| `yarn workspace @callstack/brownfield-example-rn-app test` | Plain React Native (`apps/RNApp`) |
| `yarn workspace @callstack/brownfield-example-expo-app-54 test` | Expo SDK 54 (`apps/ExpoApp54`) |
| `yarn workspace @callstack/brownfield-example-expo-app-55 test` | Expo SDK 55 (`apps/ExpoApp55`) |
| `yarn workspace @callstack/brownfield-example-rock-app test` | Rock (`apps/RockApp`) |

Package-level scripts (`yarn test` inside `apps/RNApp`, `apps/ExpoApp54`, or `apps/ExpoApp55`) invoke Jest with each app’s `jest.config.js`.

The native-only sample apps (`apps/AppleApp`, `apps/AndroidApp`) use their platform test runners (Xcode / Gradle), not Jest.
