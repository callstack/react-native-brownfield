# Expo SDK 56 Support Implementation Plan

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository uses `/Users/adam.trzcinski/.codex/agent-rules/PLANS.md` as the canonical ExecPlan format. This document must be maintained in accordance with it.

## Purpose / Big Picture

After this change, the repository should treat Expo SDK 56 as a first-class supported Expo lane. That means the published `@callstack/react-native-brownfield` package advertises Expo 56 compatibility, the Expo config plugin generates Expo-56-appropriate native defaults, the repo contains a checked-in `apps/ExpoApp56` demo bootstrapped from a fresh Expo 56 app, and both native consumer apps plus CI can exercise Expo 56 the same way they already exercise Expo 54 and Expo 55.

The user-visible proof is straightforward. From this branch, a contributor should be able to package `apps/ExpoApp56`, build the Android and iOS consumer apps against its artifacts, and see the documentation and example commands mention Expo 56 as the newest supported Expo example.

## Progress

- [x] (2026-06-01 09:30Z) Created isolated worktree at `/private/tmp/rnb-expo56-support` on branch `adamTrz/expo-56-support`.
- [x] (2026-06-01 09:35Z) Inspected existing Expo 54 and Expo 55 examples, consumer-app integrations, CI matrices, and package metadata to map all current Expo-specific touchpoints.
- [x] (2026-06-01 10:15Z) Added focused tests for SDK-aware config-plugin defaults and made Expo 56 default to iOS `16.4` plus Android compile/target SDK `36`, while leaving Expo 55 behavior unchanged.
- [x] (2026-06-01 10:25Z) Updated package metadata for Expo 56 support, including widened `@expo/config-plugins` peer compatibility and repo/package development dependencies on Expo 56 config-plugin tooling.
- [x] (2026-06-01 11:05Z) Added fresh `apps/ExpoApp56` from an Expo 56 scaffold, ported Brownfield-specific app wiring, and connected the new lane to AndroidApp, AppleApp, scripts, CI, docs, and a changeset.
- [x] (2026-06-01 11:20Z) Restored local Expo plugin resolution by adding a root `packages/react-native-brownfield/app.plugin.js` shim that points at the built CommonJS plugin entrypoint.
- [ ] Finish native validation for ExpoApp56 packaging and both consumer apps.

## Surprises & Discoveries

- Observation: The clean `main` branch does not contain the unmerged `docs/superpowers/` tree that exists in the user's dirty checkout.
  Evidence: `find docs -maxdepth 2 -type d` in the new worktree shows only `docs/docs`, `docs/docs/docs`, `docs/docs/public`, and `docs/theme`.

- Observation: The repo is not configured to ignore a project-local `.worktrees` directory, so using `/private/tmp` avoids unrelated repo churn just to satisfy worktree safety.
  Evidence: `rg -n "\.worktrees|worktrees" .gitignore .git/info/exclude` returned no matches in the new worktree.

- Observation: Expo workspace consumers cannot resolve the Brownfield config plugin locally unless `@callstack/react-native-brownfield` exposes a root `app.plugin.js` file in addition to the built library output.
  Evidence: `yarn workspace @callstack/brownfield-example-expo-app-56 prebuild` initially failed with `Failed to resolve plugin for module "@callstack/react-native-brownfield"` until a root shim was added.

- Observation: Expo 56's Jest and Worklets toolchain expects extra direct devDependencies in the app workspace compared with the Expo 55 example.
  Evidence: ExpoApp56 test and install validation required adding `@react-native/jest-preset`, `@react-native/metro-config`, and `@babel/core` before Jest and peer validation would pass cleanly enough to continue.

- Observation: Expo 56's default scaffold triggers stricter React/ESLint checks than the copied Expo 55 Brownfield demo code.
  Evidence: `yarn workspace @callstack/brownfield-example-expo-app-56 lint` initially failed on `react-hooks/refs` in `MessageBubble.tsx` and `react-hooks/set-state-in-effect` in `use-color-scheme.web.ts`, which required small React-19-safe rewrites.

- Observation: Host-tooling constraints are now the main validation blockers, not Expo 56 plugin generation.
  Evidence: ExpoApp56 `prebuild` now generates Android and iOS projects successfully with Brownfield defaults, but CocoaPods auto-install fails in the sandboxed PATH, and Android packaging needed an alternate `GRADLE_USER_HOME` plus network access for the Gradle distribution download.

## Decision Log

- Decision: Build the feature in `/private/tmp/rnb-expo56-support` instead of the current checkout.
  Rationale: The user explicitly called out unrelated in-progress work on the current branch, and the repo is not already in a linked worktree.
  Date/Author: 2026-06-01 / Codex

- Decision: Create `apps/ExpoApp56` from a fresh Expo 56 bootstrap rather than cloning `ExpoApp55`.
  Rationale: A fresh bootstrap preserves Expo 56's default file layout and native generation expectations, then Brownfield-specific wiring can be re-applied deliberately.
  Date/Author: 2026-06-01 / Codex

- Decision: Make config-plugin native defaults SDK-aware for Expo 56 instead of globally bumping defaults for all Expo users.
  Rationale: Expo 56 needs newer iOS and Android floors, while Expo 54 and Expo 55 should keep current behavior unless the user overrides values explicitly.
  Date/Author: 2026-06-01 / Codex

## Outcomes & Retrospective

Implemented outcomes so far:

- `packages/react-native-brownfield` now declares Expo 56 compatibility, resolves SDK-aware native defaults, and includes a root Expo plugin shim for local workspace consumers.
- The repo now contains `apps/ExpoApp56`, plus AndroidApp/AppleApp/CI/docs wiring that treats Expo 56 as the newest Expo lane and repoints generic `expo` aliases to it.
- AppleApp scheme discovery confirms the new `Brownfield Apple App Expo 56` target and scheme are registered in the Xcode project.

Validation evidence so far:

- `yarn workspace @callstack/react-native-brownfield test src/expo-config-plugin/__tests__/withBrownfield.test.ts src/expo-config-plugin/android/utils/__tests__/hermes.test.ts src/expo-config-plugin/android/__tests__/withAndroidModuleFiles.test.ts src/expo-config-plugin/ios/__tests__/xcodeHelpers.test.ts` passed.
- `yarn workspace @callstack/react-native-brownfield typecheck` passed.
- `yarn workspace @callstack/brownfield-example-expo-app-56 test` passed.
- `yarn workspace @callstack/brownfield-example-expo-app-56 lint` passed.
- `yarn workspace @callstack/brownfield-example-expo-app-56 prebuild` generated the native projects successfully; the only failing sub-step was automatic CocoaPods CLI installation on the host.
- `yarn workspace @callstack/brownfield-example-expo-app-56 brownfield:prepare:android:ci` passed.

Remaining caveats:

- The long-running Android `brownfield:package:android` validation progressed into full Gradle/NDK compilation after redirecting `GRADLE_USER_HOME` and allowing network access, but it had not finished at the time this plan was updated.
- `brownfield:publish:android`, AppleApp Expo 56 build validation, and Brownfield iOS packaging remain pending behind host tooling and native build completion.

## Context and Orientation

The package under change is `packages/react-native-brownfield`. Its Expo config plugin entrypoint is `packages/react-native-brownfield/src/expo-config-plugin/withBrownfield.ts`, which resolves default iOS and Android packaging settings for Expo apps before delegating to the platform-specific plugin code. Its publish-time compatibility metadata lives in `packages/react-native-brownfield/package.json`, and the repo-level Expo config plugin development dependency currently lives in the workspace root `package.json`.

The repository already ships two Expo demo apps: `apps/ExpoApp54` and `apps/ExpoApp55`. These are not just samples; they are also inputs to native road tests. `apps/AndroidApp` contains product flavors and Maven coordinates for Expo artifacts, while `apps/AppleApp` contains separate targets and build scripts for Expo artifacts. `.github/workflows/ci.yml` filters Expo-specific paths and runs Android and iOS road-test matrices for Expo 54 and Expo 55. Any new Expo lane must be wired through all of these places to be a real support claim rather than a partial example.

The docs currently describe two Expo examples and treat `expo` aliases as Expo 55. Those references live in `apps/README.md`, `docs/docs/docs/getting-started/examples.mdx`, `docs/docs/docs/guides/expo-updates/how-to.mdx`, and related pages. They need to move in lockstep with the example app and consumer-app aliases.

## Plan of Work

Start with tests and metadata. Add or extend focused unit tests around the Expo config plugin so Expo 56 is explicitly covered as the `>=55` branch, and add a small assertion path for SDK-aware defaults. After the red test is in place, update the package metadata and `resolveConfig` logic in `packages/react-native-brownfield` so Expo 56 is represented both in peer compatibility and generated native defaults.

Next, add the new demo app. Create `apps/ExpoApp56` from a fresh Expo 56 bootstrap, then copy only the Brownfield-specific demo behaviors from `apps/ExpoApp55`: the app routes, shared demo components or tests, packaging scripts, Brownfield store/navigation files, and Expo Updates sample configuration. Keep Expo 56-native generated layout and dependency versions wherever possible.

After the app exists, wire Expo 56 through the consumers and automation. Add Expo 56 build scripts and aliases in `apps/AndroidApp/package.json` and `apps/AppleApp/package.json`, new Android flavor and Maven coordinate wiring under `apps/AndroidApp/app/build.gradle.kts` and `apps/AndroidApp/gradle/libs.versions.toml`, AppleApp target and scheme wiring in the Xcode project, and Expo 56 path filters plus matrices in `.github/workflows/ci.yml` and any supporting GitHub composite actions.

Finish by updating docs and release bookkeeping. Refresh the example-app docs to mention all three Expo lanes, rebase generic `expo` aliases to Expo 56, and add a changeset describing official Expo 56 support. Then run the targeted validation commands and record what passed, what was blocked, and any remaining caveats.

## Concrete Steps

Work from the worktree root:

    cd /private/tmp/rnb-expo56-support

Inspect current Expo-specific touchpoints:

    rg -n "ExpoApp54|ExpoApp55|expo54|expo55|Expo 55|Expo SDK 55" apps packages docs .github

Run focused package tests before changes to establish baseline:

    yarn workspace @callstack/react-native-brownfield test src/expo-config-plugin/android/utils/__tests__/hermes.test.ts src/expo-config-plugin/android/__tests__/withAndroidModuleFiles.test.ts src/expo-config-plugin/ios/__tests__/xcodeHelpers.test.ts

Expected outcome: the existing focused tests pass and do not mention Expo 56 yet.

After adding new failing tests, rerun only the targeted red tests first, then the broader package checks:

    yarn workspace @callstack/react-native-brownfield test <targeted-new-tests>
    yarn workspace @callstack/react-native-brownfield typecheck

Once `apps/ExpoApp56` exists, validate it with:

    cd /private/tmp/rnb-expo56-support/apps/ExpoApp56
    yarn test
    yarn expo prebuild --platform android
    yarn brownfield:prepare:android:ci
    yarn brownfield:package:android
    yarn brownfield:publish:android
    yarn brownfield:package:ios

Then validate the consumer apps:

    cd /private/tmp/rnb-expo56-support/apps/AndroidApp
    yarn build:example:android-consumer:expo56

    cd /private/tmp/rnb-expo56-support/apps/AppleApp
    yarn build:example:ios-consumer:expo56

## Validation and Acceptance

The change is accepted when all of the following are true.

First, `packages/react-native-brownfield` advertises Expo 56 support in a way a consumer would actually see: peer dependencies allow Expo 56, and config-plugin tests prove Expo 56 takes the post-55 branch with newer Expo-56-specific defaults.

Second, `apps/ExpoApp56` behaves like a maintained repo example rather than a loose experiment. It must install, test, prebuild, and package with the same Brownfield scripts that the Expo 54 and Expo 55 apps use.

Third, both native consumer apps must be able to consume Expo 56 artifacts. On Android, the Expo 56 flavor must resolve the Expo 56 Maven artifact and build successfully. On iOS, the Expo 56 AppleApp target and scheme must build successfully against the packaged Expo 56 XCFramework.

Fourth, the docs and command aliases must line up with the behavior. A contributor reading the example docs should see that the repo now contains Expo 54, Expo 55, and Expo 56, and generic `expo` aliases should refer to the newest supported Expo example, which is Expo 56 after this change.

## Idempotence and Recovery

All repo edits in this plan are additive or local replacements and are safe to re-run from the worktree. If a generated Expo 56 native tree becomes inconsistent during bootstrap, delete only `apps/ExpoApp56/android` and `apps/ExpoApp56/ios` and regenerate them with `expo prebuild` rather than resetting the entire worktree. If consumer-app validation fails after ExpoApp56 packages successfully, keep the packaged artifacts in place and debug the consumer integration separately so packaging and consumption failures stay distinguishable.

The worktree can be discarded safely with `git worktree remove /private/tmp/rnb-expo56-support` only after any desired commits have been pushed or cherry-picked elsewhere. Do not remove the user's original checkout or modify its unrelated work.

## Artifacts and Notes

Key baseline facts captured before implementation:

    packages/react-native-brownfield/package.json
      peerDependencies["@expo/config-plugins"] = "^54.0.4"

    packages/react-native-brownfield/src/expo-config-plugin/withBrownfield.ts
      ios.deploymentTarget default = "15.0"
      android.targetSdkVersion default = 35
      android.compileSdkVersion default = 35

    apps/AndroidApp/package.json
      expo alias -> expo55

    apps/AppleApp/package.json
      expo alias -> expo55

## Interfaces and Dependencies

This work intentionally does not add a new public config-plugin option. The user-facing interface change is behavioral: Expo 56 consumers should be able to use the existing `@callstack/react-native-brownfield` plugin entrypoint and get Expo-56-appropriate defaults automatically when they have not overridden them.

The implementation relies on the existing Expo config-plugin stack already used in this repository: `@expo/config-plugins`, `@expo/config-types`, the Brownfield Expo plugin modules under `packages/react-native-brownfield/src/expo-config-plugin/`, and the existing example-app packaging commands exposed through the built-in `brownfield` CLI. The new Expo 56 example should reuse the existing shared app-test package `@callstack/brownfield-example-shared-tests` where possible so example behavior remains comparable across Expo lanes.
