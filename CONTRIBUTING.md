# Contributing to React Native Brownfield

## Project setup

Run `yarn` in the root of the repository to install all dependencies.

Depending on your needs, you may need to install CocoaPods in a subset of the below directories:
- example React Native iOS app: `cd apps/RNApp/ios && pod install`
- integrated iOS tester app: `cd apps/TesterIntegrated/swift && pod install`

## Scripts

- `lint` - runs linting on all JS/TS source files in the monorepo *[Turbo]* 
- `gradle-plugin:lint` - runs linting on the Brownfield Gradle plugin source code
- `typecheck` - runs TypeScript type checking on all TS source files in the monorepo *[Turbo]* 
- `build` - runs all `build*` tasks in the Turbo repo - see below for more details *[Turbo]* 
- `release` - releases a new version of React Native Brownfield package using `release-it`
- `brownfield:plugin:publish:local` - publishes the Brownfield Gradle plugin to your local Maven repository for testing purposes
- `build:brownfield` - builds the React Native Brownfield package (`packages/react-native-brownfield`) *[Turbo]* 
- `build:docs` - builds the documentation site (`docs/`) *[Turbo]* 
- `build:tester-integrated:android` - builds the Android integrated tester app (`apps/TesterIntegrated/android`) *[Turbo]* 
- `build:tester-integrated:ios` - builds the iOS integrated tester app (`apps/TesterIntegrated/swift`) *[Turbo]* 
- `build:example:android-rn` - builds the example React Native app for Android (`apps/RNApp/android`) *[Turbo]* 
- `build:example:ios-rn` - builds the example React Native app for iOS (`apps/RNApp/ios`) *[Turbo]* 
- `build:example:android-consumer` - builds the example native Android consumer app (`apps/AndroidApp`) *[Turbo]* 
- `build:example:ios-consumer` - builds the example native Apple consumer app (`apps/AppleApp`) *[Turbo]* 