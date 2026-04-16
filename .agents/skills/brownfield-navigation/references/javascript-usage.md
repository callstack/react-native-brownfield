# Brownfield Navigation JavaScript Usage

**Product docs:** Authoritative documentation paths are listed in [`SKILL.md`](SKILL.md) in this folder.

## Discoverability triggers

- "how to call BrownfieldNavigation from JS"
- "`undefined is not a function` on a Brownfield method"
- "JS method missing after updating `brownfield.navigation.ts`"
- "Brownfield JS method exists but opens wrong destination"

## Scope

In scope:
- Calling `BrownfieldNavigation.<method>()` from React Native code.
- JS call-site patterns for buttons/screens and parameter passing.
- Runtime troubleshooting for JS-facing failures (`undefined is not a function`, missing methods, API drift signals).
- Reminding users when contract changes require codegen and native rebuild.

Out of scope:
- Authoring `brownfield.navigation.ts` and codegen mechanics. For that, read [`setup-codegen.md`](setup-codegen.md) in this folder.
- Android/iOS delegate implementation and startup registration details. For that, read [`native-integration.md`](native-integration.md) in this folder.

## Procedure

1. Confirm readiness before discussing JS calls
   - Native delegate registration must already be in place before JS uses the module.
   - If registration/startup order is uncertain, read [`native-integration.md`](native-integration.md) in this folder.

2. Provide the default JS invocation pattern
   - Import `BrownfieldNavigation` from `@callstack/brownfield-navigation`.
   - Call generated methods directly from handlers (for example, button `onPress`).
   - Keep method names and argument shape aligned with the generated API.

3. Recommend call-site best practices
   - Pass stable explicit params (`userId`, IDs, flags), not transient UI-derived data.
   - Keep each JS method call mapped to a clearly named native destination.
   - Use simple direct calls first; avoid wrapping in unnecessary abstractions while debugging.

4. Apply troubleshooting flow for runtime failures
   - `undefined is not a function`: method changed in spec but codegen/rebuild not reapplied.
   - Native crash on call: likely delegate registration/startup ordering issue; hand off implementation details to [`native-integration.md`](native-integration.md) in this folder.
   - Method exists but wrong route/no-op: generated method present, but native delegate wiring likely incorrect; route delegate fixes to [`native-integration.md`](native-integration.md) in this folder.

5. Enforce regeneration rule when JS/native API drift appears
   - If method names, params, or return types changed in `brownfield.navigation.ts`, rerun:
     `npx brownfield navigation:codegen`
   - Then rebuild native apps before retesting JS calls.

6. Route non-JS root causes quickly
   - Spec placement/signature/codegen output questions → [`setup-codegen.md`](setup-codegen.md) in this folder.
   - Delegate implementation/registration/lifecycle questions → [`native-integration.md`](native-integration.md) in this folder.

## Quick reference

- Import: `import BrownfieldNavigation from '@callstack/brownfield-navigation'`
- Typical calls:
  - `BrownfieldNavigation.navigateToSettings()`
  - `BrownfieldNavigation.navigateToReferrals('user-123')`
- Regenerate on contract change: `npx brownfield navigation:codegen`
- Retest order:
  1. Confirm contract shape
  2. Regenerate
  3. Rebuild native apps
  4. Retest JS call sites
- Error cues this skill should handle first:
  - `undefined is not a function` on a Brownfield method
  - JS method missing after updating `brownfield.navigation.ts`
  - JS call parameters appear out of sync with generated API
