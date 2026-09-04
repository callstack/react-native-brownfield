# Task 7: Fix the getting-started docs task-name collision - Report

## What was done

Successfully updated the Android getting-started documentation to address the task-name collision when both the manual `tasks.register("removeDependenciesFromModuleFile")` block and the new `includeTransitiveDependencies` option are used together.

### Implementation details

**File modified:** `docs/docs/docs/getting-started/android.mdx`

**Changes made:**

1. **Added warning sentence (line 316):** Inserted a plain-text sentence before the existing task registration block:
   - "Skip this task-registration block entirely if you plan to use the `includeTransitiveDependencies` option described below."

2. **Added blockquote documentation (after line 335):** Inserted a comprehensive blockquote explaining:
   - The purpose of the manual task (stripping embedded-module dependencies from the POM)
   - When to skip it (if using the new option)
   - The alternative approach using `includeTransitiveDependencies = true`
   - A warning against combining both approaches (which causes the `task ... already exists` error)
   - A code example showing the proper `reactBrownfield { }` configuration

3. **Preserved existing content:** The original `tasks.register("removeDependenciesFromModuleFile")` block and its `finalizedBy` wiring remain unchanged and in place, since users who don't use the new option still need this manual configuration.

## Exact diff

```diff
diff --git a/docs/docs/docs/getting-started/android.mdx b/docs/docs/docs/getting-started/android.mdx
index 0f55091..6186595 100644
--- a/docs/docs/docs/getting-started/android.mdx
+++ b/docs/docs/docs/getting-started/android.mdx
@@ -313,6 +313,8 @@ publishing {
     }
 }
 
+Skip this task-registration block entirely if you plan to use the `includeTransitiveDependencies` option described below.
+
 val moduleBuildDir: Directory = layout.buildDirectory.get()
 
 tasks.register("removeDependenciesFromModuleFile") {
@@ -332,6 +334,18 @@ tasks.named("generateMetadataFileForMavenAarPublication") {
 }
 ```
 
+> **Transitive dependencies:** the snippet above strips embedded-module entries from the generated POM by hand. If you don't need your embedded modules' own third-party dependencies to be resolvable by the app consuming this AAR, this manual snippet is all you need — skip the rest of this note.
+>
+> If you *do* want that (e.g. your embedded native modules pull in AndroidX libraries the consuming app should get automatically via Maven), set `includeTransitiveDependencies = true` in this module's `reactBrownfield { }` block instead of hand-rolling the JSON-manipulation task below — the plugin now performs the equivalent removal *and* injects your modules' real dependencies for you:
+>
+> ```kotlin
+> reactBrownfield {
+>     includeTransitiveDependencies = true
+> }
+> ```
+>
+> Do **not** combine this option with a hand-written `tasks.register("removeDependenciesFromModuleFile")` in the same module — the plugin registers a task with that exact name once the option is enabled, and Gradle throws `task 'removeDependenciesFromModuleFile' already exists` if both are present.
+
 ## 7. Create a Brownfield Configuration
 
 Create `brownfield.config.json` in your project root:
```

## Verification performed

Since Node.js and Yarn are not available in this sandbox environment, a manual syntax verification was performed instead of running the actual build command (`cd docs && yarn build`).

### Manual MDX syntax verification checks:

1. **Code fence integrity:**
   - Opening fence (line 285): ` ```kotlin ` ✓
   - Closing fence (line 335): ` ``` ` ✓
   - Nested code fence within blockquote (lines 341, 345): ` ```kotlin ` and ` ``` ` ✓
   - All fences properly opened and closed

2. **Blockquote structure:**
   - All blockquote lines (337-347) correctly marked with `>` at line start ✓
   - Blockquote properly nested code example ✓
   - Blockquote naturally terminates before next heading (line 349: `## 7. Create a Brownfield Configuration`) ✓

3. **Markdown formatting:**
   - Bold formatting: `**Transitive dependencies:**`, `**not**` ✓
   - Code formatting: backticks for inline code and ` ``` ` fences ✓
   - Inline backtick for `includeTransitiveDependencies`, `tasks.register("removeDependenciesFromModuleFile")`, etc. ✓
   - Proper em-dash characters (`—`) in long sentences ✓

4. **Overall structure:**
   - Warning sentence placed before task block ✓
   - Original task block preserved unchanged ✓
   - Documentation blockquote placed after task block ✓
   - Next section heading properly separated ✓
   - No unclosed fences or mismatched markers ✓

All MDX syntax elements are correctly formed. No obvious syntax errors were found.

## Commit information

**Commit hash:** `503856e`
**Commit message:** `docs: describe includeTransitiveDependencies option, flag task-name collision`
**Branch:** `feat/bgp-transitive-dependencies-rnc`

## Critical fix applied

### Issue identified
During initial review, a critical structural error was discovered: the warning sentence "Skip this task-registration block entirely if you plan to use the `includeTransitiveDependencies` option described below." was incorrectly placed **inside** the `````kotlin` code fence (opened at line 287, closed at line 335 in the corrected version).

This caused three problems:
1. The sentence rendered as Kotlin code with broken syntax highlighting
2. The backticks around `includeTransitiveDependencies` did not render as inline code—they appeared as literal backtick characters
3. The code block was contaminated with non-code prose

### Fix applied
Commit `a26fa2c`: The warning sentence was relocated from inside the fence (original position between `}` and `val moduleBuildDir...`) to **outside the fence**, as a standalone paragraph immediately after the "Add publishing configuration:" heading and before the ` ```kotlin ` fence opens.

**New structure (correct):**
```
Add publishing configuration:

Skip this task-registration block entirely if you plan to use the `includeTransitiveDependencies` option described below.

```kotlin
[pure Kotlin code, no prose]
```
```

### Verification of fix
Grep output confirming fence boundaries:
```
283: Add publishing configuration:
285: Skip this task-registration block entirely...  (OUTSIDE fence)
287: ```kotlin  (fence opens)
288-334: [pure Kotlin code]
335: ```  (fence closes)
337: > **Transitive dependencies:**  (blockquote follows)
341: > ```kotlin  (nested fence within blockquote)
345: > ```  (nested fence closes)
```

The warning sentence is now genuine prose outside any code fence, ensuring:
- Proper Markdown rendering
- Inline code backticks render correctly
- Code fence contains only valid Kotlin syntax
- Clear, readable documentation structure

## Testing notes

The documentation changes directly address the issue described in Task 2: when a user enables `includeTransitiveDependencies = true`, the plugin registers a task named `removeDependenciesFromModuleFile`. If a user follows both the old manual instructions AND enables the new option, Gradle throws an error. This update now:

1. Makes the collision clear to users
2. Explains when to use each approach
3. Prevents accidental misconfiguration
4. Maintains backward compatibility by keeping the manual approach available for those who don't use the new option

## Final commit

**Commit hash:** `a26fa2c`
**Commit message:** `fix: move warning sentence outside code fence in docs`
**Branch:** `feat/bgp-transitive-dependencies-rnc`
