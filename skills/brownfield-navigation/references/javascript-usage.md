# JavaScript Usage

Use this file for React Native call sites and JS-facing failures.

## Call pattern

```tsx
import BrownfieldNavigation from '@callstack/brownfield-navigation';

BrownfieldNavigation.openNativeProfile('user-123');
```

## Checklist

- Call generated methods directly from user actions first
- Keep params explicit and stable
- Keep method names aligned with generated API

## Fast triage

- `undefined is not a function`:
  - Usually codegen/rebuild drift after contract edits
- Method exists but opens wrong screen:
  - Usually delegate wiring issue (see native docs)
- Crash on first call:
  - Often delegate registration order issue (see native docs)

## Recovery order

1. Confirm contract shape
2. Run `npx brownfield navigation:codegen`
3. Rebuild iOS/Android
4. Retest JS call
