# Setup and Codegen

Use this file for contract shape and generation behavior.

## Contract requirements

- File name: `brownfield.navigation.ts`
- File location: React Native app root
- Interface name: `BrownfieldNavigationSpec` or `Spec`
- Prefer `void` navigation methods
- Promise-returning methods are not supported by generated native implementations

## Codegen

- Default command: `npx brownfield navigation:codegen`
- Explicit path: `npx brownfield navigation:codegen <specPath>`
- Use explicit path when running outside app root or in monorepos

## Artifact location

Generated files are written under resolved `@callstack/brownfield-navigation` package root.

Typical outputs:
- `src/NativeBrownfieldNavigation.ts`
- `src/index.ts`
- `ios/BrownfieldNavigationDelegate.swift`
- `ios/NativeBrownfieldNavigation.mm`
- `android/src/main/java/<generated-package>/BrownfieldNavigationDelegate.kt`
- `android/src/main/java/<generated-package>/NativeBrownfieldNavigationModule.kt`

## Regeneration rule

If contract surface changes (method names, params, types, optionality):
1. Update `brownfield.navigation.ts`
2. Run codegen
3. Rebuild native apps
