# Brownie Architecture

Shared state management between React Native and Native apps (iOS).

## High-Level Architecture

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   TypeScript    │──────▶│  brownfield CLI  │──────▶│  Swift/Kotlin   │
│   Schema Spec   │       │     (codegen)    │       │   data types    │
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
│   useBrownfield() │                          │   (Swift)             │
└───────────────────┘                          └───────────────────────┘
```

## CLI command

The `brownfield codegen` CLI command generates native store types from TypeScript schema.

### Usage

```bash
brownfield codegen                   # Generate for all configured platforms
brownfield codegen -p swift          # Generate Swift only
brownfield codegen --platform kotlin # Generate Kotlin only
brownfield codegen --help            # Show help for Brownie state management codegen
brownfield --version                 # Show version
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
│  │  - getPropertyNames() -> list of property names           │  │
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
- `unbox()` - Returns full state snapshot as JSI object
- `getPropertyNames()` - Returns list of all property names
- Uses built-in `jsi::valueFromDynamic`/`jsi::dynamicFromValue` converters

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
- `get(_:)` - Get property via keypath
- Observes `BrownieStoreUpdated` notification, rebuilds typed state from C++ snapshot
- `deinit` removes notification observer

**StoreManager** - Swift-side registry (delegates to C++):

- `register(store:key:)` - Register Swift store
- `store(key:as:)` - Retrieve typed store
- `snapshot(key:)` - Get snapshot via C++ bridge

**@UseStore** - SwiftUI property wrapper with selector support:

```swift
@UseStore(\BrownfieldStore.counter) var counter
// counter -> Double (wrappedValue, read-only)
// $counter -> Binding<Double> (projectedValue, standard SwiftUI binding)
// $counter.set { $0 + 1 } (Binding extension for closure updates)
```

- Requires `WritableKeyPath` selector - forces explicit state selection
- `Value` must conform to `Equatable` for change detection
- Uses `removeDuplicates()` internally - only re-renders when selected value changes
- `wrappedValue` - Selected value (read-only)
- `projectedValue` - Standard `Binding<Value>` for SwiftUI controls

**Binding Extension** - Adds closure-based setter:

- `set(_:)` - Set value via closure that receives current value

## JS API

### React Hook

`useStore` requires a selector function to subscribe to a specific slice of state:

```ts
import { useStore } from '@callstack/brownie';

// Select primitive - re-renders only when counter changes
const [counter, setState] = useStore('BrownfieldStore', (s) => s.counter);

// Select object
const [user, setState] = useStore('BrownfieldStore', (s) => s.user);

// Select entire state (re-renders on any change)
const [state, setState] = useStore('BrownfieldStore', (s) => s);

// Update state (partial update)
setState({ counter: counter + 1 });

// Update with callback (like useState)
setState((prev) => ({ counter: prev.counter + 1 }));
```

**How it works:**

1. Native side notifies JS on every state change (full state)
2. Each `useStore` subscribes to full state but extracts only what it needs via selector
3. React's `useSyncExternalStore` compares previous vs new selected value - skips re-render if equal

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

Snapshots refresh on native store change callback.

## Data Transfer & Memory Model

### Overview

Data flows through multiple layers with **full copies** at each boundary crossing. There is no shared memory or zero-copy optimization - each layer maintains its own representation.

```
┌─────────────┐    copy    ┌─────────────┐    copy    ┌─────────────┐
│  JS Object  │ ─────────▶ │   folly::   │ ─────────▶ │ NSDictionary│
│  (jsi)      │ ◀───────── │   dynamic   │ ◀───────── │   / Swift   │
└─────────────┘    copy    └─────────────┘    copy    └─────────────┘
```

Note: In the future we may explore optimizations like shared memory or zero-copy techniques, but for now simplicity and correctness are prioritized.

### C++ Layer (Source of Truth)

**Writes use move semantics where possible:**

- `BrownieStore::set(key, value)` - value is moved into state: `state_[key] = std::move(value)`
- `BrownieStore::setState(state)` - entire state is moved: `state_ = std::move(state)`
- `BrownieStoreManager::registerStore(key, store)` - shared_ptr is moved into map

**Reads always copy:**

- `BrownieStore::get(key)` - returns copy of `folly::dynamic` value
- `BrownieStore::getSnapshot()` - returns copy of entire state

### JSI Boundary (JS ↔ C++)

**JS → C++ (writes):**

1. `jsi::dynamicFromValue(rt, value)` creates new `folly::dynamic` from JS value
2. Value is then moved into C++ store

**C++ → JS (reads):**

1. `folly::dynamic` is copied from store
2. `jsi::valueFromDynamic(rt, dynamic)` creates new JS value

### ObjC++ Bridge (C++ ↔ Swift)

**Swift → C++ (writes):**

1. Swift encodes `Codable` state to JSON via `JSONEncoder`
2. JSON deserialized to `NSDictionary`
3. `convertIdToFollyDynamic(dict)` creates `folly::dynamic` copy
4. Value moved into C++ store

**C++ → Swift (reads):**

1. `folly::dynamic` copied from store via `getSnapshot()`
2. `convertFollyDynamicToId(dynamic)` creates `NSDictionary` copy
3. `JSONSerialization.data(withJSONObject:)` serializes to JSON
4. `JSONDecoder` deserializes to typed Swift struct (another copy)

### Performance Implications

| Operation                | Copies | Notes                             |
| ------------------------ | ------ | --------------------------------- |
| JS read single property  | 2      | dynamic copy + JSI conversion     |
| JS read snapshot (unbox) | 2      | dynamic copy + JSI conversion     |
| JS write single property | 2      | JSI→dynamic + move into store     |
| Swift read snapshot      | 4      | dynamic→NSDictionary→JSON→Codable |
| Swift write full state   | 4      | Codable→JSON→NSDictionary→dynamic |

### Thread Safety

- C++ store protected by `std::mutex` on all operations
- Swift `StoreManager` uses `NSLock` for registry access
- Change notifications dispatched to main queue via `dispatch_async`

### Future Optimization Opportunities

The ObjC++ bridge layer has the most room for optimization:

- **Skip JSON serialization** - Instead of `folly::dynamic → NSDictionary → JSON → Codable`, expose individual property accessors from C++ directly to Swift. Eliminates 2 intermediate copies.
- **Single-property sync** - Currently `pushStateToCxx()` serializes entire state. Could track dirty properties and only sync changed values.
- **Lazy Swift state rebuild** - Defer `Codable` struct reconstruction until property actually accessed.
- **Direct C++ ↔ Swift interop** - Swift 5.9+ has experimental C++ interop that could bypass ObjC++ bridge entirely.

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
