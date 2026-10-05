#!/usr/bin/env bash
# Scaffold smoke: run the built @callstack/create-react-native-brownfield CLI against a
# fresh `@react-native-community/cli init` app and build the generated Android
# packaging module (Android only — no pods/xcodebuild, to stay cheap).
# Catches pbxproj/gradle/Kotlin-template mistakes that unit tests cannot.
#
# Usage (from repo root, after `yarn build`):
#   bash ./scripts/ci-scaffold-smoke-android.sh
#
# Env:
#   SMOKE_WORKDIR  where to create the app (default: mktemp -d)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKDIR="${SMOKE_WORKDIR:-$(mktemp -d "${TMPDIR:-/tmp}/brownfield-scaffold-smoke.XXXXXX")}"
APP_NAME="BFSmoke"
# Android project subdirectory of the generated app (RN CLI template layout).
GRADLE_DIR="android"

echo "::group::Create RN CLI app"
mkdir -p "$WORKDIR"
cd "$WORKDIR"
# --install-pods false: iOS pods are out of scope for this Android-only smoke.
npx --yes "@react-native-community/cli@latest" init "$APP_NAME" \
  --directory "$APP_NAME" \
  --pm npm \
  --install-pods false
cd "$APP_NAME"
echo "react-native version: $(node -p "require('./package.json').dependencies['react-native']")"
echo "::endgroup::"

echo "::group::Run scaffold CLI"
node "$REPO_ROOT/packages/create-react-native-brownfield/dist/main.js" --debug
echo "::endgroup::"

echo "::group::Install scaffolded dependencies"
# The scaffold adds `^<local repo version>` ranges; those may not be published
# yet mid-cycle. The point of this smoke is the scaffolded project wiring, so
# resolve both Brownfield packages to whatever is published on npm (same
# artifact a real user installs). The scaffolded Kotlin compiles against them.
npm pkg set "dependencies.@callstack/react-native-brownfield=latest" \
            "dependencies.@callstack/brownfield-cli=latest"
npm install --no-audit --no-fund
echo "::endgroup::"

echo "::group::Verify scaffold output"
# Read the expected plugin version from the same constant the scaffold emits.
PLUGIN_VERSION="$(sed -nE "s/^export const BROWNFIELD_PLUGIN_VERSION = '([^']+)';/\1/p" \
  "$REPO_ROOT/packages/react-native-brownfield/src/expo-config-plugin/android/utils/constants.ts")"
test -n "$PLUGIN_VERSION" || { echo "could not read BROWNFIELD_PLUGIN_VERSION"; exit 1; }
test -f "$GRADLE_DIR/brownfieldlib/build.gradle.kts" || { echo "missing brownfieldlib/build.gradle.kts"; exit 1; }
test -f brownfield.config.json || { echo "missing brownfield.config.json"; exit 1; }
grep -qF "brownfield-gradle-plugin:$PLUGIN_VERSION" "$GRADLE_DIR/build.gradle" || { echo "root build.gradle lacks the Brownfield Gradle plugin classpath for $PLUGIN_VERSION"; exit 1; }
grep -q "include ':brownfieldlib'" "$GRADLE_DIR/settings.gradle" || { echo "settings.gradle lacks ':brownfieldlib'"; exit 1; }
echo "::endgroup::"

echo "::group::Assemble Android packaging module"
# The freshly generated app pins its own ndkVersion in buildscript ext; install
# it if missing (CI runners carry a different preinstalled set). No-op locally
# when the NDK is already present.
NDK_VERSION="$(sed -nE 's/.*ndkVersion = "([^"]+)".*/\1/p' "$GRADLE_DIR/build.gradle" | head -1)"
SDKMANAGER="${ANDROID_HOME:-}/cmdline-tools/latest/bin/sdkmanager"
if [ -n "$NDK_VERSION" ] && [ -n "${ANDROID_HOME:-}" ] && [ ! -d "$ANDROID_HOME/ndk/$NDK_VERSION" ]; then
  if [ -x "$SDKMANAGER" ]; then
    yes | "$SDKMANAGER" --licenses >/dev/null 2>&1 || true
    "$SDKMANAGER" --install "ndk;$NDK_VERSION"
  fi
fi
# `-p "$GRADLE_DIR"` sets the project dir; the `./$GRADLE_DIR/gradlew` prefix is
# the wrapper's location relative to the app root (we stay in the app root, so
# the two "android" occurrences are not a typo).
"./$GRADLE_DIR/gradlew" -p "$GRADLE_DIR" :brownfieldlib:assembleRelease --no-daemon
test -n "$(find "$GRADLE_DIR/brownfieldlib/build/outputs/aar" -name '*.aar' 2>/dev/null)" || { echo "no AAR produced"; exit 1; }
echo "::endgroup::"

echo "Scaffold smoke PASSED"
