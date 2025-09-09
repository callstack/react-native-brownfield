# Brownfield Store Plan

## Current State Analysis

**What exists:**

- iOS: `Store<State>` with Combine, `StoreManager` singleton, `@UseStore` property wrapper
- ✅ Bi-directional host object (Native ↔ JS)
- ✅ Notification `BrownieStoreUpdated` wired to JS via event emitter
- ✅ Multiple stores supported via key parameter
- ✅ Swift codegen from TypeScript schema

**Remaining problems:**

1. ~~No codegen from shared TypeScript spec~~ ✅ Done (Swift)
2. Android missing (codegen + Store implementation)
3. No selector-based re-renders optimization
4. Kotlin codegen not yet implemented

## Architecture

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   TypeScript    │──────▶│     Codegen      │──────▶│  Swift/Kotlin   │
│   Schema Spec   │       │                  │       │  + TS types     │
└─────────────────┘       └──────────────────┘       └─────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Host Object (JSI)                           │
│  ┌──────────────┐                              ┌──────────────────┐ │
│  │  get(prop)   │◀─────── shared state ───────▶│   set(prop,val)  │ │
│  └──────────────┘                              └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
        ▲                                                 │
        │ read                                            │ write
        │                                                 ▼
┌───────────────────┐                          ┌───────────────────────┐
│   JS/React Hook   │                          │   Native Store        │
│   useBrownfield() │                          │   (Swift/Kotlin)      │
└───────────────────┘                          └───────────────────────┘
```

## Implementation Plan

### Phase 1: Schema Definition & Codegen ✅ DONE (Swift)

1. ✅ **Define schema in TypeScript:**

   ```ts
   // brownfield-store.schema.ts
   export type BrownfieldStore = {
     counter: number;
     user: string;
     isLoading: boolean;
   };
   ```

2. ✅ **Codegen pipeline:**

   ```
   TS type → quicktype-typescript-input → JSON Schema → quicktype-core → Swift Codable
   ```

3. ✅ **Implementation:**
   - `scripts/generate-store.ts` - TypeScript codegen script
   - Uses `quicktype-core` + `quicktype-typescript-input` packages
   - Compiles to `lib/scripts/generate-store.js` during build
   - Exposed as CLI binary: `npx brownfield-generate-store`
   - Output: `BrownfieldStore.swift` with `var` properties + `Codable`

4. ✅ **Config (package.json):**

   ```json
   {
     "brownfield": {
       "stores": {
         "schema": "./brownfield-store.schema.ts",
         "typeName": "BrownfieldStore",
         "swift": "./swift/Generated/BrownfieldStore.swift"
       }
     }
   }
   ```

5. ✅ **Generated output:**

   ```swift
   struct BrownfieldStore: Codable {
       var counter: Double
       var isLoading: Bool
       var user: String
   }
   ```

6. **TODO: Kotlin codegen** - add `kotlin` output path to config

### Phase 2: Bi-directional Host Object (iOS) ✅ DONE

1. ✅ **`BrownieStoreObject` with key support:**
   - `get(prop)` - reads from store by key
   - `set(prop, value)` - writes to native store
   - `unbox()` - returns full state snapshot
   - `__getStore(key)` factory function for multiple stores

2. ✅ **Notifications → JS:**
   - `BrownieStoreUpdated` → `emitNativeStoreDidChange` → JS listeners notified
   - All registered stores refresh on change

3. ✅ **Store implementation:**
   - `Store.set(_:)` - updater function
   - `Store.set(_:to:)` - keypath setter
   - `Store.setProperty(_:value:)` - dynamic property setter (for JS)
   - All mutations dispatch to main thread and post notification

### Phase 3: JS API ✅ DONE (Basic)

1. ✅ **Core API:**

   ```ts
   // Subscribe to store changes
   subscribe(key: string, listener: () => void): () => void

   // Get current snapshot
   getSnapshot<T>(key: string): T

   // Set state
   setState<T>(key: string, partial: Partial<T>): void
   ```

2. ✅ **Store cache:**
   - `Map<string, StoreCache>` holds host object, snapshot, and listeners per key
   - Snapshots refresh on native change event

3. **TODO: Zustand-style hook:**

   ```ts
   const useAppStore = createBrownfieldStore<AppState>('AppState');
   const counter = useAppStore((s) => s.counter); // selector
   useAppStore.setState({ counter: 5 });
   ```

4. **TODO: Selector optimization:**
   - Only re-render when selected value changes

### Phase 4: Android Implementation

1. **Create `BrownfieldStore.kt`** - mirror Swift Store/StoreManager
2. **JSI bindings via C++** or use `@ReactMethod` with `HybridObject`
3. **Emit events** on state change

### Phase 5: Codegen Integration ✅ DONE (Manual)

1. ✅ **Manual trigger:** `npx brownfield-generate-store`
   - Exposed via `bin` field in package.json
   - Reads config from consumer's package.json

2. **Linking generated files (user responsibility):**
   - iOS: Add Generated folder to Xcode project once, regenerations auto-update
   - Android: Add Generated folder to source sets

3. **Optional auto-generate hooks (documented, not enforced):**

   iOS (Podfile):

   ```ruby
   pre_install do |installer|
     system("npx", "brownfield-generate-store")
   end
   ```

   Android (build.gradle.kts):

   ```kotlin
   tasks.register("generateBrownfieldStore") {
     exec { commandLine("npx", "brownfield-generate-store") }
   }
   preBuild.dependsOn("generateBrownfieldStore")
   ```

4. ✅ **Config format (package.json):**
   ```json
   {
     "brownfield": {
       "stores": {
         "schema": "./brownfield-store.schema.ts",
         "typeName": "BrownfieldStore",
         "swift": "./ios/Generated/BrownfieldStore.swift",
         "kotlin": "./android/src/main/java/generated/BrownfieldStore.kt"
       }
     }
   }
   ```
