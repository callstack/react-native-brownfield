# create-react-native-brownfield

Scaffolds [React Native Brownfield](https://oss.callstack.com/react-native-brownfield/) packaging targets into an **existing** React Native Community CLI project (non-Expo), so that `brownfield package:ios` and `brownfield package:android` work with no manual setup.

For Expo projects, use the [Expo config plugin](https://oss.callstack.com/react-native-brownfield/docs/getting-started/expo) instead — it performs the equivalent setup on every prebuild.

## Usage

From the root of your React Native project:

```bash
npx create-react-native-brownfield@latest
```

Or with your package manager's `create` alias:

```bash
yarn create react-native-brownfield
```

```bash
pnpm create react-native-brownfield
```

## What it does

The command mutates your project in place:

- **Android**
  - `android/build.gradle` — adds the `com.callstack.react:brownfield-gradle-plugin` classpath
  - `android/settings.gradle` — includes the new library module
  - `android/<androidModuleName>/` — creates the packaging module: `build.gradle.kts` (Brownfield plugin, autolinking, RN dependencies, build config fields, `maven-publish`) and a `ReactNativeHostManager.kt` written for a non-Expo host
- **iOS**
  - `ios/<project>.xcodeproj` — adds a framework target with the required build settings and the `Bundle React Native code and images` phase copied from your app target
  - `ios/Podfile` — adds a nested `target '<iosFrameworkName>'` block with `inherit! :complete`
  - `ios/<iosFrameworkName>/` — creates the framework sources (`<iosFrameworkName>.swift`, `Info.plist`)
- **Project wiring**
  - `package.json` — adds `@callstack/react-native-brownfield` and `@callstack/brownfield-cli` as dependencies and the `package:ios` / `package:android` scripts (existing versions and scripts are never overwritten)
  - `brownfield.config.json` — generates the packaging settings (iOS scheme and configuration, Android module name and variant); skipped if a `brownfield.config.js` or a legacy `brownfield` key in `package.json` already exists, since the CLI accepts only one config source

Afterwards, install dependencies and produce your artifacts:

```bash
npm install
npm run package:ios      # XCFramework into ios/.brownfield/package/build/
npm run package:android  # Fat-AAR
```

Integrating the produced artifacts into your native app is covered by the [iOS](https://oss.callstack.com/react-native-brownfield/docs/getting-started/ios) and [Android](https://oss.callstack.com/react-native-brownfield/docs/getting-started/android) guides (for this scaffolded path, see [React Native CLI Integration](https://oss.callstack.com/react-native-brownfield/docs/getting-started/rnc-cli)).

## Options

| Flag                              | Default         | Purpose                                                        |
| --------------------------------- | --------------- | -------------------------------------------------------------- |
| `-p, --path <path>`               | `.`             | Path to the React Native project root                          |
| `--ios-framework-name <name>`     | `BrownfieldLib` | iOS framework target name (also the framework directory name)  |
| `--android-module-name <name>`    | `brownfieldlib` | Android library module name                                    |
| `--debug`                         | `false`         | Verbose logging                                                |

## Idempotency

The command is safe to re-run. Already-applied mutations are detected and skipped: no duplicate Xcode targets, build phases, Podfile blocks, gradle lines, dependencies, or scripts. `brownfield.config.json` is rewritten with content derived from the framework/module names, so an unchanged re-run leaves the bytes untouched.

It edits files you own, though — review the outcome with `git diff` before committing. If a run fails halfway, fix the cause and re-run: completed steps are recognized as done, so no manual rollback is needed.

## Requirements

- A React Native Community CLI project (Expo projects use the config plugin instead)
- Node.js `>=20`
- iOS packaging: Xcode + CocoaPods. Android packaging: Android SDK

## Relationship to `brownfield init`

This package is currently the full implementation, not just a wrapper: the `brownfield` CLI does not expose an `init` subcommand yet. When it does, this package will forward to it and the CLI command will become the canonical entry point.
