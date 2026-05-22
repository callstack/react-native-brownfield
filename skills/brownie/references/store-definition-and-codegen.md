# Brownie Store Definition and Codegen

Use this for store schema authoring and regeneration issues.

## Store contract

- File ends with `.brownie.ts`
- Store interface extends `BrownieStore`
- Module augmentation adds the store to `BrownieStores`
- Store key matches intended public name

## Example

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

## Codegen workflow

1. Import each store file from app entry.
2. Run `npx brownfield codegen`.
3. Rebuild native artifacts after schema changes.

## Common fixes

- Missing generated files: verify `.brownie.ts` suffix and augmentation.
- Stale native/JS types: rerun codegen and rebuild.
