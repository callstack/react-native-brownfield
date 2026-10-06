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

### Verifying a change

Run the checks for the area you touched before opening a PR. CI runs the same ones, so this catches most failures locally.

| If you changed | Run |
| --- | --- |
| TS/JS in `packages/` | `yarn lint`, `yarn typecheck` and `yarn test:packages`. The pre-commit hook already runs lint and typecheck on staged JS/TS files. |
| `scripts/` | `yarn test:scripts` |
| JS in the example apps under `apps/` | `yarn test:apps` |
| The `BrownfieldConfig` type | `yarn generate:schema`. The pre-commit hook regenerates `packages/cli/schema.json` and stages it. |
| The Brownfield Gradle plugin (`gradle-plugins/react/brownfield`) | From that directory: `./gradlew detekt ktlintCheck test`, which is what CI runs. `yarn gradle-plugin:lint` also runs detekt, but its `ktlintFormat` rewrites files. |
| Native iOS or Android code in a package | Build the affected example with its `build:example:*` script (see [Workspace scripts](#workspace-scripts)), then run the matching E2E with the [Local CI scripts](#local-ci-scripts). |
| Anything in a published package | Add a changeset with `yarn changeset`. CI fails the PR without one (`changeset status`). |

## Publishing to npm

We use [changesets](https://github.com/changesets/changesets) to version and publish packages. Contributors only add a changeset to their PR. CI does the rest.

The release workflow (`.github/workflows/release.yml`) runs on every push to `main`:

1. A PR with a changeset is merged to `main`.
2. The workflow builds the packages, runs `yarn ci:version` (which bumps versions, updates changelogs and refreshes the lockfile), and opens or updates a PR titled `chore(release): version packages` with the result.
3. Merging the version PR runs the workflow again, and this time `yarn ci:publish` (`changeset publish`) publishes the new versions to npm.

The packages listed in the `fixed` group in `.changeset/config.json` always share one version. A changeset for any of them bumps all of them.

CI has no npm token. It publishes through [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), which uses the workflow's OIDC identity (`id-token: write`). Trusted publishing requires npm CLI 11.5.1 or later and Node 22.14.0 or later on the runner. To confirm a release went through CI, check that `npm view <package-name>@<version> _npmUser` shows `GitHub Actions`.

### Publishing a new package for the first time

A trusted publisher can only be configured for a package that already exists on npm. A brand-new package therefore needs one manual publish by a maintainer. After that, CI publishes it like every other package.

> [!IMPORTANT]
> Publish the new package manually and configure its trusted publisher before merging the PR that adds it. Otherwise the next release tries to publish a package that CI has no permission for, and the release fails.

The order is: manual publish, configure the trusted publisher, merge the PR, then let the next version PR publish the package.

1. Use an npm account (personal or a Callstack one) with two-factor authentication enabled.
2. Ask a Callstack npm org admin to add your npm username to the `@callstack` org. npm sends the invitation by email; accept it. The default `developer` role is enough to publish a new package under the scope.
3. Log in and check the account:

   ```sh
   npm login
   npm whoami
   ```

   `npm login` prints a URL instead of asking for a password. Finish the login, including two-factor authentication, in the browser.

4. Prepare the package on the PR branch:
   - Set `version` in its `package.json` to the version the rest of the fixed group uses (see `packages/react-native-brownfield/package.json`).
   - Add the package name to the `fixed` group in `.changeset/config.json`.
   - Make sure `publishConfig.access` is `public`.
5. Build all packages from the repository root:

   ```sh
   yarn build
   ```

6. Pack the package. Use `yarn` here, not `npm`: dependencies between workspace packages use `workspace:^`, and `npm publish` run inside the package folder would publish that range literally. `yarn pack` replaces it with real versions.

   ```sh
   yarn workspace <package-name> pack
   ```

   This writes `package.tgz` into the package folder.

7. Inspect the tarball before publishing. Check the file list, and check that `package/package.json` inside it has no `workspace:` ranges:

   ```sh
   tar -tzf packages/<dir>/package.tgz
   tar -xzOf packages/<dir>/package.tgz package/package.json | grep workspace:
   ```

   The second command should print nothing. Optionally, run `npm publish packages/<dir>/package.tgz --dry-run`.

8. Publish the tarball:

   ```sh
   npm publish packages/<dir>/package.tgz
   ```

   Run this in an interactive terminal. npm prints an authentication URL and waits with "Press ENTER to open in the browser". Approve the publish there and npm finishes on its own. In a non-interactive shell, such as a command run by an AI agent, npm can't wait and fails with `EOTP`. Nothing is published in that case, so run the command again in a regular terminal.

   A published version can't be published again, even after unpublishing. Double-check the version before running this.

9. Check that the version is live:

   ```sh
   npm view <package-name> versions
   ```

   npm reports "Your package is being processed and may take a few minutes to become available". Until processing ends, the registry only lists a `0.0.0-stage` placeholder. The real version showed up after about two minutes the first time we did this.

10. Delete `package.tgz`. Never commit it.

Example: `@callstack/create-react-native-brownfield` lives in `packages/create-react-native-brownfield` and was first published by hand as `5.1.1`.

### Configuring the trusted publisher

Do this once per package, right after its first manual publish. The other packages in the repo already have the same connection, so you can compare with any of them (for example `https://www.npmjs.com/package/@callstack/brownfield-navigation/access`).

1. Open the settings page of the new package: `https://www.npmjs.com/package/<package-name>/access`. Make sure it is the new package and not an existing one. Adding the same connection to a package that already has it fails with "a trusted publisher configuration that a token could also match already exists for this package".
2. Under **Trusted Publisher**, select **GitHub Actions** and fill in the form:
   - **Label**: leave empty.
   - **Organization or user**: `callstack`
   - **Repository**: `react-native-brownfield`. This is the GitHub repository that publishes, not the npm package name.
   - **Workflow filename**: `release.yml`
   - **Environment name**: leave empty. The release workflow doesn't use one.
   - **Allowed actions**: check **Allow npm publish**, leave **Allow npm dist-tag** unchecked. `npm stage publish` is always allowed.

   The provider and required fields can't be edited after saving. To fix a typo, delete the connection and create a new one.
3. Click **Set up connection**. The card should show `callstack/react-native-brownfield`, `release.yml` and the permissions **npm publish** and **npm stage publish**.
4. Under **Publishing access**, select **Require two-factor authentication and disallow bypass 2fa tokens (recommended)** and click **Update Package Settings**. Trusted publishing keeps working with this option.

## Scripts

Root scripts run from the repository root with `yarn <script>`. Scripts marked _[Turbo]_ call `turbo run`, which runs the task of the same name in every workspace that defines it.

### Build, lint and test

- `build` - runs `build` in all workspaces, building dependencies first _[Turbo]_
- `build:brownfield` - runs `build:brownfield` in the packages under `packages/` that define it _[Turbo]_
- `build:docs` - runs `build:docs` in the documentation site (`docs/`) _[Turbo]_
- `dev` - runs `dev` in all workspaces in parallel (`yarn workspaces foreach`)
- `lint` - runs `lint` in all workspaces _[Turbo]_
- `typecheck` - runs `typecheck` in all workspaces _[Turbo]_
- `test:packages` - runs `test` in the workspaces under `packages/` _[Turbo]_
- `test:apps` - runs Jest in the example apps under `apps/` _[Turbo]_
- `test:scripts` - runs the Node test runner on `scripts/__tests__/**/*.test.ts`

### Brownfield Gradle plugin

- `brownfield:plugin:publish:local` - builds the plugin in `gradle-plugins/react/brownfield` and publishes a snapshot to your local Maven repository, without signing
- `brownfield:plugin:publish:local:signed` - same as above, but signed and without the snapshot flag
- `brownfield:plugin:version:check` - fails if the plugin version in `gradle-plugins/react/brownfield/gradle.properties` doesn't match the copies in the JS package and the example apps
- `brownfield:plugin:version:sync` - writes that version into those copies
- `brownfield:plugin:release-notes` - generates release notes for the plugin from git history. Requires `--version` and `--output`; `--ref` is optional.

### Code generation

- `generate:schema` - regenerates `packages/cli/schema.json` from the `BrownfieldConfig` type (runs `generate:schema` in `@callstack/brownfield-cli`)
- `generate:store` - points to `scripts/generate-store.ts`, which doesn't exist in the repository, so the script currently fails

### Release and CI

- `ci:version` - used by the release workflow. See [Publishing to npm](#publishing-to-npm).
- `ci:publish` - used by the release workflow. See [Publishing to npm](#publishing-to-npm).
- `ci:local:*` - reproduce the CI E2E jobs locally. See [Local CI scripts](#local-ci-scripts).

### Skill evaluations

- `skillgym:brownie` - runs the SkillGym suite in `skillgym/suites/brownie-suite.ts`
- `skillgym:navigation` - runs the SkillGym suite in `skillgym/suites/brownfield-navigation-suite.ts`

### Workspace scripts

These live in a workspace, not in the root `package.json`. Run them with `yarn workspace <name> <script>` from the root, or with `yarn <script>` from the workspace directory.

`apps/RNApp` (`@callstack/brownfield-example-rn-app`):

- `build:example:android-rn` - builds the Android app (`react-native build-android`)
- `build:example:ios-rn` - builds the iOS app (`react-native build-ios`)

`apps/AndroidApp` (`@callstack/brownfield-example-android-app`), one Gradle flavor per consumed RN app:

- `build:example:android-consumer:vanilla` - consumes `apps/RNApp` (`assembleVanillaRelease`)
- `build:example:android-consumer:expo58` - consumes `apps/ExpoApp58` (`assembleExpo58Release`)
- `build:example:android-consumer:expo57` - consumes `apps/ExpoApp57` (`assembleExpo57Release`)
- `build:example:android-consumer:expo` - alias for `build:example:android-consumer:expo57`
- `build:example:android-consumer:expopreview` - consumes the Expo preview app (`assembleExpopreviewRelease`)

`apps/AppleApp` (`@callstack/brownfield-example-ios-app`), each copies the XCFrameworks with `prepareXCFrameworks.js` and runs `xcodebuild`:

- `build:example:ios-consumer:vanilla` - consumes `RNApp`, scheme **Brownfield Apple App Vanilla** (`Release Vanilla`)
- `build:example:ios-consumer:expo58` - consumes `ExpoApp58`, scheme **Brownfield Apple App Expo 58** (`Release`)
- `build:example:ios-consumer:expo57` - consumes `ExpoApp57`, scheme **Brownfield Apple App Expo 57** (`Release`)
- `build:example:ios-consumer:expo` - alias for `build:example:ios-consumer:expo57`
- `build:example:ios-consumer:expopreview` - consumes `ExpoAppPreview`, scheme **Brownfield Apple App Expo Preview** (`Release`)

`gradle-plugins/react` (`@callstack/brownfield-gradle-plugin-react`):

- `gradle-plugin:lint` - runs detekt and `ktlintFormat` on the Brownfield Gradle plugin. `ktlintFormat` rewrites files in place.

## Running demo apps

Each of the apps in `apps/` provides scripts for running them. You can run them either standalone, or package for brownfield.

### Standalone run

Each of the apps can be run standalone, by running `yarn ios` or `yarn android`.

### Packaging for brownfield

To package an application for brownfield, you can run `yarn brownfield:package:ios` or `yarn brownfield:publish:android`.

### Running a brownfield host app

There are 2 brownfield host apps.

> [!IMPORTANT]
> Each of the scripts below requires you to **first** package the consumed RN application with `yarn brownfield:package:ios`, e.g. `cd apps/ExpoApp58 && yarn brownfield:package:ios`.

- `apps/AndroidApp` - for Android
  - `build:example:android-consumer:expo58` - consumes Expo 58
  - `build:example:android-consumer:expo57` (or `expo`) - consumes Expo 57
  - `build:example:android-consumer:vanilla` - consumes the vanilla `RNApp`
- `apps/AppleApp` - for Apple (one Xcode target per consumed RN app, each with its own shared scheme)
  - `build:example:ios-consumer:expo58` — target `Brownfield Apple App (ExpoApp58)`, scheme **Brownfield Apple App Expo 58**
  - `build:example:ios-consumer:expo57` (or `expo`) — target `Brownfield Apple App (ExpoApp57)`, scheme **Brownfield Apple App Expo 57**
  - `build:example:ios-consumer:vanilla` — target `Brownfield Apple App (RNApp)`, scheme **Brownfield Apple App Vanilla**

For iOS, these scripts validate the legacy direct-XCFramework integration path. Each script uses the previously packaged artifacts from the respective directory (`apps/RNApp`, `apps/ExpoApp58`, or `apps/ExpoApp57`), invokes `prepareXCFrameworks.js` to copy XCFrameworks into `apps/AppleApp/package`, then runs `xcodebuild` against the matching scheme. The Xcode project reads fixed paths under `package/` (for example `package/BrownfieldLib.xcframework`).

| Yarn script                          | RN app      | Xcode target                       | Scheme                       | Configuration     |
| ------------------------------------ | ----------- | ---------------------------------- | ---------------------------- | ----------------- |
| `build:example:ios-consumer:vanilla` | `RNApp`     | `Brownfield Apple App (RNApp)`     | Brownfield Apple App Vanilla | `Release Vanilla` |
| `build:example:ios-consumer:expo58`  | `ExpoApp58` | `Brownfield Apple App (ExpoApp58)` | Brownfield Apple App Expo 58 | `Release`         |
| `build:example:ios-consumer:expo57`  | `ExpoApp57` | `Brownfield Apple App (ExpoApp57)` | Brownfield Apple App Expo 57 | `Release`         |

> [!IMPORTANT]
> You can build and run `AppleApp` from the Xcode GUI by selecting the scheme for the variant you want. Before running, after switching schemes or re-packaging an RN app, run the matching `build:example:ios-consumer:...` script so fresh artifacts are present in `apps/AppleApp/package`. Otherwise Xcode will still link against the previous XCFrameworks.

### Running `AppleApp` with local SPM

The local Swift Package Manager flow is separate from `prepareXCFrameworks.js`. Instead of copying artifacts into `apps/AppleApp/package`, generate a local package next to the packaged RN app and add that package in Xcode.

1. Package the producer app with `--add-spm-package`, for example:
   - `cd apps/RNApp && yarn exec brownfield package:ios --scheme BrownfieldLib --configuration Release --add-spm-package`
   - `cd apps/ExpoApp58 && yarn exec brownfield package:ios --scheme BrownfieldLib --configuration Release --add-spm-package`
   - `cd apps/ExpoApp57 && yarn exec brownfield package:ios --scheme BrownfieldLib --configuration Release --add-spm-package`
2. Open `apps/AppleApp/Brownfield Apple App.xcodeproj`.
3. Select the host scheme you want to validate:
   - `Brownfield Apple App Vanilla`
   - `Brownfield Apple App Expo 58`
   - `Brownfield Apple App Expo 57`
4. In Xcode, go to `Package Dependencies`, click `+`, choose `Add Local...`, and select the generated package folder:
   - `apps/RNApp/ios/.brownfield/package/build`
   - `apps/ExpoApp58/ios/.brownfield/package/build`
   - `apps/ExpoApp57/ios/.brownfield/package/build`
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
| `yarn workspace @callstack/brownfield-example-expo-app-58 test` | Expo SDK 58 (`apps/ExpoApp58`)    |

Package-level scripts (`yarn test` inside `apps/RNApp` or `apps/ExpoApp58`) invoke Jest with each app’s `jest.config.js`.

The native-only sample apps (`apps/AppleApp`, `apps/AndroidApp`) use their platform test runners (Xcode / Gradle), not Jest.

## E2E tests (Detox)

End-to-end tests use [Detox](https://wix.github.io/Detox/) on the iOS Simulator and Android emulator. Shared specs and helpers live in `apps/brownfield-example-shared-tests/e2e/`; each app wires them through its own `.detoxrc*.cjs` and `e2e/jest.config*.cjs`.

E2E runs without Metro: release/debug host builds load the JS bundle embedded in the packaged brownfield artifact so the app matches CI.

### Two integration paths

| Path                                            | What it exercises                                                | Typical flow                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| RN host app (`RNApp`)                           | Brownfield RN app running as the simulator target                | pods → Detox build → Detox test                                                                 |
| native host app (`AppleApp` / `AndroidApp`)     | Native host consuming a packaged XCFramework / AAR               | package → install into native consumer → Detox build → Detox test                               |

Per-app Detox scripts (run from the app directory):

| App                       | Build                       | Test                       | Shared spec                        |
| ------------------------- | --------------------------- | -------------------------- | ---------------------------------- |
| `RNApp`                   | `yarn e2e:build:ios`        | `yarn e2e:test:ios`        | `rnAppBrownfield.e2e.js`           |
| `AppleApp` (vanilla)      | `yarn e2e:build:ios`        | `yarn e2e:test:ios`        | `appleAppBrownfield.e2e.js`        |
| `AppleApp` (Expo 58)      | `yarn e2e:build:ios:expo58` | `yarn e2e:test:ios:expo58` | `appleAppExpoBrownfield.e2e.js`    |
| `AppleApp` (Expo 57)      | `yarn e2e:build:ios:expo57` | `yarn e2e:test:ios:expo57` | `appleAppExpoBrownfield.e2e.js`    |
| `AndroidApp` (vanilla)    | `yarn e2e:build:android`    | `yarn e2e:test:android`    | `androidAppBrownfield.e2e.js`      |
| `AndroidApp` (Expo 58)    | `yarn e2e:build:android:expo58` | `yarn e2e:test:android:expo58` | `androidAppExpoBrownfield.e2e.js` |
| `AndroidApp` (Expo 57)    | `yarn e2e:build:android:expo57` | `yarn e2e:test:android:expo57` | `androidAppExpoBrownfield.e2e.js` |

### CI

iOS Detox E2E runs in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) via [`.github/actions/appleapp-road-test`](.github/actions/appleapp-road-test/action.yml):

| Job                           | E2E | Notes                                    |
| ----------------------------- | --- | ---------------------------------------- |
| `ios-appleapp-vanilla`        | Yes | `RNApp` → package → `AppleApp` Detox     |
| `ios-appleapp-expo` (Expo 58) | Yes | `ExpoApp58` → package → `AppleApp` Detox |
| `ios-appleapp-expo` (Expo 57) | Yes | `ExpoApp57` → package → `AppleApp` Detox |

Android Detox E2E uses [`.github/actions/androidapp-road-test`](.github/actions/androidapp-road-test/action.yml):

| Job                                      | E2E | Notes                                         |
| ---------------------------------------- | --- | --------------------------------------------- |
| `android-androidapp-vanilla`             | Yes | `RNApp` → AAR → `AndroidApp` Detox            |
| `android-androidapp-expo58-build` / `-e2e` | Yes | `ExpoApp58` → AAR → Detox APKs → emulator   |
| `android-androidapp-expo57-build` / `-e2e` | Yes | `ExpoApp57` → AAR → Detox APKs → emulator   |

On failure, CI uploads Detox artifacts (`detox-*-ios-recordings` / `detox-androidapp-*-android`).

Direct host-app E2E is local-only — use the `ci:local:*` scripts below to reproduce CI-like setup.

### Local CI scripts

From the repo root (macOS + Xcode + Simulator required for iOS). All wrap `scripts/ci-local-ios-e2e-common.sh` and accept the same flags:

| Command                                              | Mirrors                          |
| ---------------------------------------------------- | -------------------------------- |
| `yarn ci:local:rnapp:e2e:ios`                        | RN host app E2E (`apps/RNApp`)   |
| `yarn ci:local:appleapp:e2e:ios`                     | CI `ios-appleapp-vanilla`        |
| `yarn ci:local:appleapp:e2e:ios --variant expo58`    | CI `ios-appleapp-expo` (Expo 58) |
| `yarn ci:local:appleapp:e2e:ios --variant expo57`    | CI `ios-appleapp-expo` (Expo 57) |

From `apps/AppleApp`, you can also use `yarn ci:local:e2e:ios:expo58` / `yarn ci:local:e2e:ios:expo57`.

Android (Android SDK + emulator; defaults to `Pixel_4_API_34`):

| Command                                                 | Mirrors                                      |
| ------------------------------------------------------- | -------------------------------------------- |
| `yarn ci:local:androidapp:e2e:android`                  | CI `android-androidapp-vanilla`              |
| `yarn ci:local:androidapp:e2e:android:expo58`           | CI Expo 58 AndroidApp Detox                  |
| `yarn ci:local:androidapp:e2e:android:expo57`           | CI Expo 57 AndroidApp Detox                  |

From `apps/AndroidApp`, you can also use `yarn ci:local:e2e:android:expo58` / `yarn ci:local:e2e:android:expo57`.

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
