# Brownfield Store

Shared state management between React Native and Native apps (iOS/Android).

## Architecture

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   TypeScript    │──────▶│   Brownie CLI    │──────▶│  Swift/Kotlin   │
│   Schema Spec   │       │    (codegen)     │       │   data types    │
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

## CLI

The `brownie` CLI generates native store types from TypeScript schema.

### Installation

CLI is included in `@callstack/brownie` package.

### Usage

```bash
brownie codegen                   # Generate for all configured platforms
brownie codegen -p swift          # Generate Swift only
brownie codegen --platform kotlin # Generate Kotlin only
brownie --help                    # Show help
brownie --version                 # Show version
```

### Configuration

Add to your app's `package.json`:

```json
{
  "brownie": {
    "swift": "./ios/Generated/",
    "kotlin": "./android/app/src/main/java/com/example/",
    "kotlinPackageName": "com.example"
  }
}
```

| Field               | Required | Description                               |
| ------------------- | -------- | ----------------------------------------- |
| `swift`             | No\*     | Output directory for Swift files          |
| `kotlin`            | No\*     | Output directory for Kotlin files         |
| `kotlinPackageName` | No       | Kotlin package name (extracted from path) |

\*At least one of `swift` or `kotlin` is required.

### Store Definition

Stores are auto-discovered from `*.brownie.ts` files. Define your store shape using module augmentation:

```ts
// BrownfieldStore.brownie.ts
import type { BrownieStore } from '@callstack/brownie';

interface BrownfieldStore extends BrownieStore {
  counter: number;
  user: string;
  isLoading: boolean;
}

declare module '@callstack/brownie' {
  interface BrownieStores {
    BrownfieldStore: BrownfieldStore;
  }
}
```

Multiple stores in same file:

```ts
// Stores.brownie.ts
import type { BrownieStore } from '@callstack/brownie';

interface UserStore extends BrownieStore {
  name: string;
  email: string;
}

interface SettingsStore extends BrownieStore {
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
}

declare module '@callstack/brownie' {
  interface BrownieStores {
    UserStore: UserStore;
    SettingsStore: SettingsStore;
  }
}
```

### Generated Output

**Swift** (`Codable` struct with mutable properties):

```swift
struct BrownfieldStore: Codable {
    var counter: Double
    var isLoading: Bool
    var user: String
}
```

**Kotlin** (data class):

```kotlin
package com.example

data class BrownfieldStore (
    val counter: Double,
    val isLoading: Boolean,
    val user: String
)
```

## CLI Implementation

### File Structure

```
packages/brownie/scripts/
├── cli.ts              # Entry point, parseArgs, command routing
├── config.ts           # Config loading from package.json
├── store-discovery.ts  # Auto-discover *.brownie.ts files
├── commands/
│   └── codegen.ts      # Codegen command with --platform flag
└── generators/
    ├── swift.ts        # Swift Codable generation
    └── kotlin.ts       # Kotlin data class generation
```

### Store Discovery

1. Recursively finds `*.brownie.ts` files (skips node_modules)
2. Parses `declare module '@callstack/brownie'` blocks using ts-morph
3. Extracts store names from `BrownieStores` interface properties
4. Validates no duplicate store names exist

### Codegen Pipeline

```
*.brownie.ts files (auto-discovered)
       │
       ▼
ts-morph (parse BrownieStores interface)
       │
       ▼
quicktype-typescript-input (schemaForTypeScriptSources)
       │
       ▼
JSON Schema
       │
       ▼
quicktype-core
       │
       ├──▶ Swift (lang: 'swift', mutable-properties: true)
       │
       └──▶ Kotlin (lang: 'kotlin', framework: 'just-types')
```

### Build

Scripts are compiled with TypeScript during package build:

```bash
yarn build  # runs bob build && tsc -p scripts/tsconfig.json
```

Output goes to `lib/scripts/` and is exposed via `bin` field in `package.json`.

## iOS Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Shared C++ Layer                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  BrownieStore (C++ class)                                 │  │
│  │  - folly::dynamic state_    ← Source of truth             │  │
│  │  - get(key) -> folly::dynamic                             │  │
│  │  - set(key, value)                                        │  │
│  │  - getSnapshot() -> folly::dynamic                        │  │
│  │  - Thread-safe with std::mutex                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  BrownieStoreManager (C++ singleton)                      │  │
│  │  - stores_: map<string, shared_ptr<BrownieStore>>         │  │
│  │  - registerStore(key) / getStore(key) / removeStore(key)  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  BrownieHostObject (jsi::HostObject)                      │  │
│  │  - get(prop) -> converts folly::dynamic to jsi::Value     │  │
│  │  - set(prop, val) -> converts jsi::Value to folly::dynamic│  │
│  │  - unbox() -> full snapshot as jsi::Object                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│  BrownieStoreBridge     │         │  Swift Store<T>         │
│  (ObjC++ wrapper)       │         │  (typed view over C++)  │
│  - Exposes C++ store    │         │  - Observes C++ changes │
│    to Swift via ObjC    │         │  - SwiftUI integration  │
│  - Posts notifications  │         │  - Uses generated types │
│    on C++ callback      │         │  - Pushes state to C++  │
└─────────────────────────┘         └─────────────────────────┘
```

### File Structure

```
packages/brownie/
├── cpp/
│   ├── BrownieStore.h/.cpp        # Core store with folly::dynamic
│   ├── BrownieStoreManager.h/.cpp # Singleton registry
│   └── BrownieHostObject.h/.cpp   # JSI HostObject
├── ios/
│   ├── BrownieModule.h/.mm        # TurboModule, installs JSI bindings
│   ├── BrownieStoreBridge.h/.mm   # ObjC++ wrapper for Swift access
│   └── BrownieStore.swift         # Swift Store<T>, StoreManager, @UseStore
```

### C++ Core

**BrownieStore** - Thread-safe store with `folly::dynamic` as source of truth:

- `get(key)` - Get property by key
- `set(key, value)` - Set property, triggers change callback
- `getSnapshot()` - Get full state
- `setState(state)` - Replace entire state
- `setChangeCallback(cb)` - Register callback for changes
- All operations protected by `std::mutex`

**BrownieStoreManager** - Singleton registry:

- `shared()` - Get singleton instance
- `registerStore(key, store)` - Register store
- `getStore(key)` - Retrieve store
- `removeStore(key)` - Cleanup store

**BrownieHostObject** - JSI bridge:

- `get(prop)` - Read property, converts `folly::dynamic` → `jsi::Value`
- `set(prop, value)` - Write property, converts `jsi::Value` → `folly::dynamic`
- `unbox()` - Returns full state snapshot
- Custom `dynamicToJSI`/`jsiToDynamic` converters

### iOS Bridge

**BrownieStoreBridge** (ObjC++) - Exposes C++ to Swift:

- `registerStore(withKey:)` - Create C++ store, set up notification callback
- `removeStore(withKey:)` - Cleanup
- `setValue(_:forKey:inStore:)` - Set property
- `getValue(forKey:inStore:)` - Get property
- `getSnapshot(forStore:)` - Get full state as NSDictionary
- `setState(from:forStore:)` - Set full state from NSDictionary
- Posts `BrownieStoreUpdated` notification with `storeKey` in userInfo

### Swift Layer

**Store<State: Codable>** - Generic observable store:

- `init(_ initialState, key:)` - Create store, register with C++, push initial state
- `set(_:)` - Update state with closure
- `set(_:to:)` - Update via keypath
- Observes `BrownieStoreUpdated` notification, rebuilds typed state from C++ snapshot
- `deinit` removes notification observer

**StoreManager** - Swift-side registry (delegates to C++):

- `register(store:key:)` - Register Swift store
- `store(key:as:)` - Retrieve typed store
- `snapshot(key:)` - Get snapshot via C++ bridge

**@UseStore** - SwiftUI property wrapper:

- `init(_ keyPath, key:)` - Access specific property
- `wrappedValue` - Current value
- `projectedValue` - Access to full store for mutations

## JS API

### React Hook

```ts
// useState-like API for store access
const [state, setState] = useBrownieStore('BrownfieldStore');

// Read state
console.log(state.counter);

// Update state (partial update)
setState({ counter: state.counter + 1 });

// Update with callback (like useState)
setState((prev) => ({ counter: prev.counter + 1 }));
```

### Core Functions

```ts
// Subscribe to store changes
subscribe(key: string, listener: () => void): () => void

// Get current snapshot
getSnapshot<K extends keyof BrownieStores>(key: K): BrownieStores[K]

// Set state (supports partial or callback)
type SetStateAction<T> = Partial<T> | ((prev: T) => Partial<T>)
setState<K extends keyof BrownieStores>(key: K, action: SetStateAction<BrownieStores[K]>): void
```

### Store Cache

Internal `Map<string, StoreCache>` holds:

- Host object reference
- Current snapshot
- Registered listeners

Snapshots refresh on `BrownieStoreUpdated` native event.

## Auto-generation Hooks

### iOS (Podfile)

```ruby
pre_install do |installer|
  system("npx", "brownie", "codegen", "-p", "swift")
end
```

### Android (build.gradle.kts)

```kotlin
tasks.register("generateBrownfieldStore") {
  exec { commandLine("npx", "brownie", "codegen", "-p", "kotlin") }
}
preBuild.dependsOn("generateBrownfieldStore")
```

## TODO

### Codegen

- [x] Support multiple stores in package.json config (array of store configs)
- [x] Auto-discover stores from `*.brownie.ts` files (no manual config needed)
- [x] Add CLI tests
- [x] Generate store keys enum/constants for type safety between JS and Native

### Native Runtime

- [x] Improve iOS runtime code (C++ core with folly::dynamic)
- [x] Extract C++ JSI layer to be shared across Android and iOS
- [ ] Android native runtime implementation (Store, StoreManager, JSI bridge)
- [ ] Keypath→string codegen for optimized single-key updates (future)

### JS Runtime

- [x] useState-like hook API (`useBrownieStore` returns `[state, setState]`)
- [x] setState supports callback pattern `(prev) => partial`
- [ ] Optimize re-renders on the JS side (selector support)
- [ ] Zustand integration

### Distribution

- [ ] Support xcframework packaging (iOS)
- [ ] Support AAR packaging (Android)
- [ ] Figure out autolinking of generated code

### Documentation

- [ ] Documentation
