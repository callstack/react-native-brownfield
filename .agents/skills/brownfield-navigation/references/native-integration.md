# Brownfield Navigation Native Integration

**Product docs:** Authoritative documentation paths are listed in [`SKILL.md`](SKILL.md) in this folder.

## Discoverability triggers

- "implement `BrownfieldNavigationDelegate`"
- "where to call `BrownfieldNavigationManager.setDelegate(...)`"
- "where to call `BrownfieldNavigationManager.shared.setDelegate(...)`"
- "navigation call crashes at app startup or upon invocation"

## Scope

In scope:
- Implementing generated `BrownfieldNavigationDelegate` methods in Android and iOS host code.
- Registering the delegate with `BrownfieldNavigationManager` during app startup.
- Enforcing startup/lifecycle ordering (delegate registered before JS calls).
- Troubleshooting native wiring issues (crash/no-op/wrong route).

Out of scope:
- Authoring `brownfield.navigation.ts` and running codegen. For that, read [`setup-codegen.md`](setup-codegen.md) in this folder.
- JavaScript call-site usage patterns in RN screens. For that, read [`javascript-usage.md`](javascript-usage.md) in this folder.

## Procedure

1. Confirm prerequisite
   - `BrownfieldNavigation.xcframework` is linked in the iOS host app.
     - If applicable, note this comes from `npx brownfield package:ios` under `ios/.brownfield`.
   - `Gson` dependency is added to the Android host app.

2. Implement Android delegate
   - Implement generated `BrownfieldNavigationDelegate` in the host `Activity` (or class with navigation context).
   - Wire each generated method to the native destination and map params exactly.
   - Typical implementation starts Android `Activity` instances with `Intent` extras.

3. Register Android delegate during startup
   - Call `BrownfieldNavigationManager.setDelegate(...)` in startup flow (for example `onCreate`).
   - Registration must happen before any React Native screen can call `BrownfieldNavigation.*`.

4. Implement iOS delegate
   - Create a class conforming to `BrownfieldNavigationDelegate`.
   - Wire each generated method to the intended native presentation flow (UIKit/SwiftUI).
   - Ensure screen presentation runs on the main/UI thread.

5. Register iOS delegate during startup
   - Call `BrownfieldNavigationManager.shared.setDelegate(navigationDelegate: ...)` at app startup (for example in app `init`).
   - Registration must happen before RN-rendered routes can invoke module methods.

6. Enforce lifecycle requirements
   - Delegate must be present before JS usage; missing delegate is a startup bug.
   - Re-register if the host object owning the delegate is recreated.
   - Keep navigation/presentation work on main thread.

7. Triage runtime integration failures
   - Method added/changed in TS but missing natively: rerun `npx brownfield navigation:codegen` and rebuild.
   - Crash on launch or first method call: verify delegate registration order vs RN route rendering.
   - Method exists but wrong destination/no-op: verify delegate implementation wiring and parameter mapping.

## Quick reference

- Android delegate type: `BrownfieldNavigationDelegate`
- Android registration: `BrownfieldNavigationManager.setDelegate(...)`
- iOS delegate type: `BrownfieldNavigationDelegate`
- iOS registration: `BrownfieldNavigationManager.shared.setDelegate(navigationDelegate: ...)`
- Integration order:
  1. Generate/update contract outputs
  2. Implement delegate methods natively
  3. Register delegate at startup
  4. Render RN routes that call `BrownfieldNavigation.*`
- Error cues this skill should address:
  - Crashes when JS calls navigation methods early
  - Missing delegate registration at startup
  - Wrong native screen opened from a JS call
