# Brownie TypeScript Usage

## Discoverability triggers

- "how to use useStore with brownie"
- "Brownie selector rerender behavior"
- "update nested state with setState"
- "subscribe getSnapshot setState brownie"

## Scope

In scope:
- `useStore` usage and selector patterns in React Native.
- Update styles (partial object and callback updater).
- Nested update patterns that preserve object shape.
- Low-level APIs: `subscribe`, `getSnapshot`, `setState`.

Out of scope:
- Installation, prerequisites, and first-pass setup sequence. For that, read [`getting-started.md`](getting-started.md) in this folder.
- Store schema authoring and codegen troubleshooting. For that, read [`store-definition-and-codegen.md`](store-definition-and-codegen.md) in this folder.
- Android/iOS native registration and host usage details. For Android, read [`android-usage.md`](android-usage.md). For iOS, read [`swift-and-xcframework.md`](swift-and-xcframework.md) in this folder.

## Procedure

1. Confirm setup assumptions
   - `@callstack/brownie` is installed.
   - Store definitions are imported so typings are available.

2. Use `useStore` with explicit selector
   - Select only the state slice needed by a component.
   - Treat selectors as render boundaries (smaller selection means fewer rerenders).
   - `useStore` expects a selector; selecting whole state is valid but broadens rerender scope.

3. Pick an update pattern
   - Partial object updates for direct field assignment.
   - Callback updates when derived from previous state.
   - For nested objects, spread previous nested values to avoid dropping sibling keys.

4. Apply low-level APIs when hooks are not enough
   - Use `subscribe` for non-React or service-layer listeners.
   - Use `getSnapshot` for point-in-time reads.
   - Use `setState` to apply updates outside components.

5. Troubleshoot JS-side drift
   - Type errors on store key/fields often indicate missing augmentation import.
   - Runtime mismatch with native side after schema edits typically means codegen/rebuild was skipped.
   - If APIs changed, rerun `npx brownfield codegen` or platform packaging, then rebuild host apps.

## Compact examples

```tsx
import {useStore} from '@callstack/brownie';

const [counter, setState] = useStore('AppStore', (s) => s.counter);
setState((prev) => ({counter: prev.counter + 1}));
```

```ts
import {subscribe, getSnapshot, setState} from '@callstack/brownie';

const unsubscribe = subscribe('AppStore', () => {
  const snapshot = getSnapshot('AppStore');
  console.log(snapshot.counter);
});

setState('AppStore', (prev) => ({counter: prev.counter + 1}));
unsubscribe();
```

## Quick reference

- Hook: `useStore(storeKey, selector)`
- Updaters:
  - `setState({field: value})`
  - `setState((prev) => ({...}))`
- Low-level APIs:
  - `subscribe(storeKey, onChange)`
  - `getSnapshot(storeKey)`
  - `setState(storeKey, patchOrUpdater)`
- Error cues this guide addresses:
  - Unexpected rerenders from broad selectors
  - Nested field updates losing sibling state
  - TS key mismatch after adding new stores
  - JS updates apply locally but native host remains stale
