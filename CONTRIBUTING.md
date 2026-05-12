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
- `build` - runs all `build*` tasks in the Turbo repo - see below for more details _[Turbo]_
- `dev` - runs all `dev` tasks in all workspaces
- `brownfield:plugin:publish:local` - publishes the Brownfield Gradle plugin to your local Maven repository for testing purposes
- `build:brownfield` - builds the React Native Brownfield package (`packages/react-native-brownfield`) _[Turbo]_
- `build:docs` - builds the documentation site (`docs/`) _[Turbo]_
- `build:example:android-rn` - builds the example React Native app for Android (`apps/RNApp/android`)
- `build:example:ios-rn` - builds the example React Native app for iOS (`apps/RNApp/ios`)
- `build:example:android-consumer:expo55` - builds the example native Android consumer (`apps/AndroidApp`) app's flavor consuming the Expo 55 RN app (`apps/ExpoApp55`) artifact
- - `build:example:android-consumer:expo54` - builds the example native Android consumer (`apps/AndroidApp`) app's flavor consuming the Expo 54 RN app (`apps/ExpoApp54`) artifact
- - `build:example:android-consumer:vanilla` - builds the example native Android consumer (`apps/AndroidApp`) app's flavor consuming the vanilla RN app (`apps/RNApp`) artifact
- `build:example:ios-consumer:expo55` - builds the example native iOS consumer app (`apps/AppleApp`) consuming the Expo 55 RN app (`apps/ExpoApp55`) artifact
- `build:example:ios-consumer:expo54` - builds the example native iOS consumer app (`apps/AppleApp`) consuming the Expo 54 RN app (`apps/ExpoApp54`) artifact
- `build:example:ios-consumer:vanilla` - builds the example native iOS consumer (`apps/AppleApp`) app's flavor consuming the vanilla RN app (`apps/RNApp`) artifact

## Running demo apps

Each of the apps in `apps/` provides scripts for running them. You can run them either standalone, or package for brownfield.

## Standalone run

## Packaging for brownfield

## Running a brownfield host app

There are 2 brownfield host apps.

> [!IMPORTANT]
> Each of the scripts below requires you to **first** package the consumed RN application with `yarn brownfield:package:ios`, e.g. `cd apps/ExpoApp55 && yarn brownfield:package:ios`.

- `apps/AndroidApp` - for Android
  - `build:example:android-consumer:expo54` - consumes Expo 54
  - `build:example:android-consumer:expo55` - consumes Expo 55
  - `build:example:android-consumer:vanilla` - consumes the vanilla `RNApp`
- `apps/AppleApp` - for Apple
  - `build:example:ios-consumer:expo54` - consumes Expo 54
  - `build:example:ios-consumer:expo55` - consumes Expo 55
  - `build:example:ios-consumer:vanilla` - consumes the vanilla `RNApp`

For iOS, the scripts use the previously packaged artifacts from the respective directory `apps/{RNApp,Expo55,Expo54}` and invoke `prepareXCFrameworks.js` to copy over the XCFrameworks to the `apps/AppleApp/package` directory, from which the XCode project consumes well-known XCFramework files.

> [!IMPORTANT]
> You can build & run the `AppleApp` directly from XCode GUI, but before running it, after changing the scheme between Expo / Vanilla or making any changes & re-packaging the RN app, you need to re-run the `build:example:ios-consumer:...` script once again for the built artifacts to be available in the `apps/AppleApp/package` directory. Otherwise, you will still be building with the old artifacts.
