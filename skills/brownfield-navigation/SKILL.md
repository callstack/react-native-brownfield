---
name: brownfield-navigation
description: Route React Native calls to existing native screens through a generated Brownfield navigation contract.
license: MIT
metadata:
  author: Callstack
  tags: react-native, expo, brownfield, navigation
---

# Overview

Brownfield navigation has three steps:
1. Define `brownfield.navigation.ts`
2. Run `npx brownfield navigation:codegen`
3. Wire native delegates before JS calls

Read only the smallest reference that matches the question.

## Routing (concern -> file)

Concern | Read
--------|------
Contract file location, supported signatures, codegen command, generated artifacts | [`references/setup-codegen.md`](references/setup-codegen.md)
Calling methods from React Native, `undefined is not a function`, API drift after contract edits | [`references/javascript-usage.md`](references/javascript-usage.md)
iOS-only delegate implementation and startup registration | [`references/native-ios-integration.md`](references/native-ios-integration.md)
Android-only delegate implementation and startup registration | [`references/native-android-integration.md`](references/native-android-integration.md)

## Minimal command reference

```bash
npx brownfield navigation:codegen
npx brownfield package:ios
npx brownfield package:android
npx brownfield publish:android
```
