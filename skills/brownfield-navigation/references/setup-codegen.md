# Brownfield Navigation Setup and Codegen

## Discoverability triggers

- "where to put `brownfield.navigation.ts`"
- "run brownfield navigation codegen"
- "generated files missing after codegen"
- "spec changes not reflected in generated APIs"

## Scope

In scope:
- Authoring and updating `brownfield.navigation.ts` in the React Native app root.
- Enforcing supported signature rules (`BrownfieldNavigationSpec`/`Spec`, typed params, optional params, `void`-first guidance).
- Running `npx brownfield navigation:codegen`.
- Explaining generated artifacts and when regeneration + native rebuild are required.
- First-pass setup/codegen triage (missing files, stale API after spec changes).

Out of scope:
- Android/iOS delegate implementation and registration details. For that, read [`native-integration.md`](native-integration.md) in this folder.
- JavaScript screen usage patterns and runtime call ergonomics. For that, read [`javascript-usage.md`](javascript-usage.md) in this folder.

## Procedure

1. Confirm prerequisites
   - `@callstack/brownfield-navigation` is installed. Otherwise, install the latest version
   - Babel deps used by codegen are available (`@babel/core`, `@react-native/babel-preset`). Otherwise, install the compatible version OR ask the user.

2. Verify contract file placement and shape
   - File name is exactly `brownfield.navigation.ts`.
   - File is in the React Native app root.
   - Interface is `BrownfieldNavigationSpec` (or `Spec`).

3. Validate method signatures before codegen
   - Method names are valid TypeScript identifiers.
   - Typed params and optional params are allowed.
   - Prefer synchronous `void` navigation methods.
   - Warn that Promise-based methods are not currently supported by generated native implementations on iOS/Android; they may compile but reject with `not_implemented`.

4. Choose the right codegen invocation
   - Default form: `npx brownfield navigation:codegen`
   - Explicit path form: `npx brownfield navigation:codegen <specPath>`
   - Use the default form when your current working directory is the React Native app root and the contract file is the default `./brownfield.navigation.ts`.
   - Use the explicit-path form when you are running from another directory, when the app lives inside a workspace/monorepo, or when you want to remove ambiguity about which spec file should be parsed.
   - Relative `specPath` values are resolved from the directory where you run the command; absolute paths also work.

5. Understand the artifact root before verifying outputs
   - Codegen writes into the installed `@callstack/brownfield-navigation` package root, not into the app directory that contains `brownfield.navigation.ts`.
   - The exact absolute location depends on the consumer's package manager and workspace layout. It may live under a local `node_modules` tree, a hoisted workspace dependency, or another package-store-managed install location.
   - Treat the package root as the stable anchor, then verify these generated relative paths beneath it:
     - `src/NativeBrownfieldNavigation.ts`
     - `src/index.ts`
     - `lib/commonjs/index.js`
     - `lib/module/index.js`
     - `lib/typescript/commonjs/src/index.d.ts`
     - `lib/typescript/module/src/index.d.ts`
     - `ios/BrownfieldNavigationDelegate.swift`
     - `ios/BrownfieldNavigationModels.swift` when complex model types are generated
     - `ios/NativeBrownfieldNavigation.mm`
     - Android files under `android/src/main/java/<generated-package>/`, including `BrownfieldNavigationDelegate.kt`, `NativeBrownfieldNavigationModule.kt`, and `BrownfieldNavigationModels.kt` when complex model types are generated

6. Enforce rerun/rebuild rule
   - Any change that affects the contract surface in `brownfield.navigation.ts` requires rerunning codegen, then rebuilding native apps.
   - This includes adding, removing, renaming, or retyping methods; changing params or optionality; and introducing/removing model types used by params.
   - If JavaScript can no longer see a generated method, or native code still behaves like the old contract, assume regeneration or rebuild was skipped.
   - Safe order:
     1) update the contract
     2) rerun codegen
     3) rebuild iOS and/or Android before retesting

7. Handoff when issue is outside setup/codegen
   - Delegate lifecycle/startup order: [`native-integration.md`](native-integration.md) in this folder.
   - JS invocation/runtime call-site guidance: [`javascript-usage.md`](javascript-usage.md) in this folder.

## Quick reference

- Primary commands:
  - `npx brownfield navigation:codegen`
  - `npx brownfield navigation:codegen <specPath>`
- Contract file: `brownfield.navigation.ts` at React Native app root
- Default command behavior: reads `./brownfield.navigation.ts` from the current working directory
- Output location: generated files are written under the resolved `@callstack/brownfield-navigation` package root
- Parser-supported interface names: `BrownfieldNavigationSpec` or `Spec`
- Safe default return type: `void`
- Important order:
  1. Define/update TS contract
  2. Run codegen
  3. Rebuild native apps
- Error cues this skill should address:
  - Generated files missing or stale after spec edits
  - JS/native surfaces not reflecting renamed/added methods
  - Promise-based navigation method behaving as `not_implemented`
