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
    "stores": {
      "schema": "./brownfield-store.schema.ts",
      "typeName": "BrownfieldStore",
      "swift": "./ios/Generated/BrownfieldStore.swift",
      "kotlin": "./android/app/src/main/java/com/example/BrownfieldStore.kt",
      "kotlinPackageName": "com.example"
    }
  }
}
```

| Field               | Required | Description                                            |
| ------------------- | -------- | ------------------------------------------------------ |
| `schema`            | Yes      | Path to TypeScript schema file                         |
| `typeName`          | Yes      | Name of the type to generate                           |
| `swift`             | No\*     | Output path for Swift file                             |
| `kotlin`            | No\*     | Output path for Kotlin file                            |
| `kotlinPackageName` | No       | Kotlin package name (defaults to extraction from path) |

\*At least one of `swift` or `kotlin` is required.

### Schema Definition

Define your store shape in TypeScript:

```ts
// brownfield-store.schema.ts
export type BrownfieldStore = {
  counter: number;
  user: string;
  isLoading: boolean;
};
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
├── commands/
│   └── codegen.ts      # Codegen command with --platform flag
└── generators/
    ├── swift.ts        # Swift Codable generation
    └── kotlin.ts       # Kotlin data class generation
```

### Codegen Pipeline

```
TypeScript schema
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

### Store

`Store<State>` - Generic observable store using Combine:

- `set(_:)` - Update state with updater function
- `set(_:to:)` - Update state via keypath
- `setProperty(_:value:)` - Dynamic property setter (for JS bridge)
- All mutations dispatch to main thread and post `BrownieStoreUpdated` notification

### StoreManager

Singleton registry for multiple stores:

- `register(_:forKey:)` - Register store with string key
- `store(forKey:)` - Retrieve store by key
- Supports multiple independent stores

### Property Wrapper

`@UseStore` - SwiftUI property wrapper for automatic re-renders on store changes.

### JSI Bridge

`BrownieStoreObject` - Host object exposed to JS:

- `get(prop)` - Read property from store
- `set(prop, value)` - Write property to store
- `unbox()` - Get full state snapshot
- `__getStore(key)` - Factory for multiple stores

## JS API

### Core Functions

```ts
// Subscribe to store changes
subscribe(key: string, listener: () => void): () => void

// Get current snapshot
getSnapshot<T>(key: string): T

// Set state
setState<T>(key: string, partial: Partial<T>): void
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

- [ ] Support multiple stores in package.json config (array of store configs)
- [ ] Generate store keys enum/constants for type safety between JS and Native

### Native Runtime

- [ ] Improve iOS runtime code
- [ ] Extract C++ JSI layer to be shared across Android and iOS
- [ ] Android native runtime implementation (Store, StoreManager, JSI bridge)

### JS Runtime

- [ ] Optimize re-renders on the JS side
- [ ] Zustand integration

### Distribution

- [ ] Support xcframework packaging (iOS)
- [ ] Support AAR packaging (Android)
- [ ] Figure out autolinking of generated code

### Documentation

- [ ] Documentation
