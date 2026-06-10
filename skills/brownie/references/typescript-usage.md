# Brownie TypeScript Usage

Use this for React Native store reads/updates.

## Hook pattern

Use `useStore(storeKey, selector)` and keep selectors narrow to reduce rerenders.

```tsx
import {useStore} from '@callstack/brownie';

const [counter, setState] = useStore('AppStore', (s) => s.counter);
setState((prev) => ({counter: prev.counter + 1}));
```

## Low-level APIs

- `subscribe(storeKey, onChange)`
- `getSnapshot(storeKey)`
- `setState(storeKey, patchOrUpdater)`

## Common fixes

- TS key/type mismatch: ensure store definition file is imported in app entry.
- Drift after schema edits: rerun codegen/package and rebuild host apps.
