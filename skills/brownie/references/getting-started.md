# Brownie Getting Started

## Minimum prerequisites

- Brownfield setup already works in the project.
- `@callstack/react-native-brownfield` is installed.
- Native host app exists (iOS and/or Android).

## Exact steps

1. Install Brownie:
   - `npm install @callstack/brownie`
2. Define a store in a `*.brownie.ts` file:
   - create a store interface extending `BrownieStore`
   - augment `declare module '@callstack/brownie' { interface BrownieStores { ... } }`
3. Import that `*.brownie.ts` file from app entry (`App.tsx` or `index.js`).
4. Generate native types:
   - `npx brownfield codegen`
5. Use the store on JS side (`useStore`) and register the generated store in native startup.

## Verification command/API

- Required command: `npx brownfield codegen`
- Success signal: generated native files are present and app builds with typed store usage.

## One short example

```ts
import type { BrownieStore } from '@callstack/brownie';

interface UserStore extends BrownieStore {
  name: string;
}

declare module '@callstack/brownie' {
  interface BrownieStores {
    user: UserStore;
  }
}
```
