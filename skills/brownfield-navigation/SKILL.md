---
name: brownfield-navigation
description: Allows presenting existing native screens from React Native. Define the schema in TypeScript, run codegen to generate the bindings, invoke the function on the JS side, generate the XCFramework/AAR, and integrate native bindings such as the delegate into the host app.
license: MIT
metadata:
  author: Callstack
  tags: react-native, expo, brownfield, navigation
---

# Overview

Brownfield Navigation flows from a TypeScript contract (`brownfield.navigation.ts`) through `npx brownfield navigation:codegen`, which generates JS bindings, native stubs, and delegate protocols. Host apps implement `BrownfieldNavigationDelegate`, register it with `BrownfieldNavigationManager` at startup, then React Native code calls the generated `@callstack/brownfield-navigation` module.

# When to Apply

Reference these skills when:
- App uses brownfield setup
- Presenting existing native screen from React Native
- Configuring schema for brownfield navigation
- Implementing the brownfield navigation delegate

# Quick Reference

- Generate the files using codegen script:
```bash
npx brownfield navigation:codegen
```
- Brownfield packaging commands also run the same navigation codegen as part of packaging workflows:
```bash
# iOS
npx brownfield package:ios

# android
npx brownfield package:android
npx brownfield publish:android
```

## Routing (concern → file)

Concern | Read
--------|------
JS call sites, `BrownfieldNavigation.*` usage, `undefined is not a function`, params vs generated API | [`javascript-usage.md`](references/javascript-usage.md)
`BrownfieldNavigationDelegate`, `setDelegate` / `shared.setDelegate`, startup crashes, no-op / wrong native route | [`native-integration.md`](references/native-integration.md)
Contract placement, `BrownfieldNavigationSpec` / `Spec`, `navigation:codegen`, generated artifacts, stale or missing outputs | [`setup-codegen.md`](references/setup-codegen.md)


