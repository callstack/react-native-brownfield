---
'@callstack/brownfield-cli': patch
---

The navigation codegen no longer adds an extra blank line after the imports in the generated `index.ts`, which made the file fail Prettier.
