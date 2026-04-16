# Brownfield Navigation Setup and Codegen

**Product docs:** Authoritative documentation paths are listed in [`SKILL.md`](SKILL.md) in this folder.

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
   - Babel deps used by codegen are available (`@babel/core`, `@react-native/babel-preset`).

2. Verify contract file placement and shape
   - File name is exactly `brownfield.navigation.ts`.
   - File is in the React Native app root.
   - Interface is `BrownfieldNavigationSpec` (or `Spec`).

3. Validate method signatures before codegen
   - Method names are valid TypeScript identifiers.
   - Typed params and optional params are allowed.
   - Prefer synchronous `void` navigation methods.
   - Warn that Promise-based methods are not currently supported by generated native implementations on iOS/Android; they may compile but reject with `not_implemented`.

4. Run codegen from app root
   - Command: `npx brownfield navigation:codegen`

5. Confirm expected generated outputs
   - `src/NativeBrownfieldNavigation.ts`
   - `src/index.ts`
   - `ios/BrownfieldNavigationDelegate.swift`
   - `ios/NativeBrownfieldNavigation.mm`
   - Android delegate/module files in `android/src/main/java/com/callstack/nativebrownfieldnavigation/`

6. Enforce rerun/rebuild rule
   - Any add/remove/rename/update of methods in `brownfield.navigation.ts` requires:
     1) rerunning codegen, then
     2) recompiling native apps.

7. Handoff when issue is outside setup/codegen
   - Delegate lifecycle/startup order: [`native-integration.md`](native-integration.md) in this folder.
   - JS invocation/runtime call-site guidance: [`javascript-usage.md`](javascript-usage.md) in this folder.

## Quick reference

- Primary command: `npx brownfield navigation:codegen`
- Contract file: `brownfield.navigation.ts` at React Native app root
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
