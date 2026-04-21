---
name: brownie
description: Provides guidance for shared state in React Native brownfield apps with @callstack/brownie. Define stores in TypeScript, run brownfield codegen, use the generated APIs in React Native and native hosts, and package native artifacts for integration.
license: MIT
metadata:
  author: Callstack
  tags: react-native, expo, brownfield, state-management, brownie
---

# Overview

Brownie provides cross-platform shared state for React Native brownfield apps. The workflow starts from `*.brownie.ts` store definitions, runs `brownfield codegen` (or packaging commands that include codegen), then uses typed APIs on TypeScript, Android, and iOS sides.

# When to Apply

Reference this skill when:
- Setting up `@callstack/brownie` in an existing brownfield app
- Defining or changing store schemas in `*.brownie.ts`
- Using `useStore`, `subscribe`, `getSnapshot`, or `setState` on the JS side
- Registering and consuming stores in Android or iOS hosts
- Packaging and embedding iOS frameworks that include Brownie

# Quick Reference

- Install Brownie:
```bash
npm install @callstack/brownie
```
- Generate native types:
```bash
npx brownfield codegen
```
- Packaging commands also include Brownie codegen:
```bash
# iOS
npx brownfield package:ios --scheme YourScheme --configuration Release

# Android
npx brownfield package:android --module-name :YourModuleName --variant release
npx brownfield publish:android --module-name :YourModuleName
```

## Routing (concern -> file)

Concern | Read
--------|------
Initial install, prerequisites, setup sequence, first integration pass | [`getting-started.md`](references/getting-started.md)
`*.brownie.ts` schema rules, `BrownieStores` augmentation, type mapping, when to rerun codegen | [`store-definition-and-codegen.md`](references/store-definition-and-codegen.md)
`useStore` selectors, update patterns, low-level APIs (`subscribe`, `getSnapshot`, `setState`) | [`typescript-usage.md`](references/typescript-usage.md)
Android registration lifecycle, serializer options, package settings, build and publish flow | [`android-usage.md`](references/android-usage.md)
Swift store registration and UI usage, plus XCFramework packaging and embedding | [`swift-and-xcframework.md`](references/swift-and-xcframework.md)
