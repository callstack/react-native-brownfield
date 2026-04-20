# Brownie Store Definition and Codegen

## Discoverability triggers

- "where to put .brownie.ts files"
- "BrownieStores module augmentation"
- "brownfield codegen for brownie"
- "generated Swift or Kotlin types are stale"

## Scope

In scope:
- Authoring `*.brownie.ts` stores and augmentation rules.
- Supported schema patterns and type mapping expectations.
- Running `brownfield codegen` and knowing when to rerun.
- Verifying generated artifacts and resolving common drift issues.

Out of scope:
- Initial installation and first integration sequence. For that, read [`getting-started.md`](getting-started.md) in this folder.
- React component usage ergonomics (`useStore`, selectors, updates). For that, read [`typescript-usage.md`](typescript-usage.md) in this folder.
- Platform registration and runtime integration details. For Android, read [`android-usage.md`](android-usage.md). For iOS, read [`swift-and-xcframework.md`](swift-and-xcframework.md) in this folder.

## Procedure

1. Validate store file shape
   - File name ends with `.brownie.ts`.
   - Store interface extends `BrownieStore`.
   - `declare module '@callstack/brownie'` augments `BrownieStores`.
   - Store key in `BrownieStores` matches intended public store name.

2. Confirm schema expectations before generation
   - Scalars (`number`, `string`, `boolean`) are supported.
   - Nested object types are supported and generate native structs/classes.
   - Union string literals map to string-like native representations.

3. Ensure augmentation is loaded by TypeScript
   - Import each `.brownie.ts` file from app entry point.

4. Run codegen
   - Primary command: `npx brownfield codegen`.
   - Optional platform scope (if needed by CLI config): `npx brownfield codegen -p swift`.
   - Discovery rule: the CLI recursively scans the project for `*.brownie.ts` files (excluding `node_modules`).

5. Verify generated outputs
   - Swift output root: `node_modules/@callstack/brownie/ios/Generated/`.
   - Confirm store type files exist and include store name bindings/protocol conformance.
   - Android generation is driven by brownfield Android packaging flow; confirm generated Kotlin output path aligns with package configuration.

6. Apply rerun and rebuild rule
   - Any schema surface change requires rerunning codegen.
   - If app behavior still reflects old schema, rebuild native artifacts after codegen.

7. Triage common failures
   - Missing generated files: confirm file extension and augmentation block.
   - Types not updated: verify app entry imports and rerun codegen from project root.
   - Runtime mismatch after schema edits: rerun codegen and rebuild platform artifacts.

## Compact schema example

```ts
import type {BrownieStore} from '@callstack/brownie';

interface AppStore extends BrownieStore {
  counter: number;
  user: {name: string};
}

declare module '@callstack/brownie' {
  interface BrownieStores {
    AppStore: AppStore;
  }
}
```

## Quick reference

- File contract:
  - `*.brownie.ts`
  - `interface X extends BrownieStore`
  - `declare module '@callstack/brownie' { interface BrownieStores { ... } }`
- Type mapping (most common):
  - `number` -> `Double` (Swift)
  - `string` -> `String`
  - `boolean` -> `Bool`
  - nested object -> generated native type
- Commands:
  - `npx brownfield codegen`
  - `npx brownfield codegen -p swift`
- Regeneration triggers:
  - Added/removed store
  - Renamed key or changed field types
  - Nested model changes
