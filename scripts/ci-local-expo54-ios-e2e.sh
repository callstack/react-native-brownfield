#!/usr/bin/env bash
# Mirrors local Detox iOS E2E for apps/ExpoApp54 (same flow as ExpoApp55).
#
# Usage (from repo root):
#   yarn ci:local:expo54:e2e:ios
#   yarn ci:local:expo54:e2e:ios --clean-ios
#   yarn ci:local:expo54:e2e:ios --skip-install      # deps already installed/built
#   yarn ci:local:expo54:e2e:ios --rebuild           # Detox build + test (skip yarn install / prebuild / pods)
#   yarn ci:local:expo54:e2e:ios --test-only         # tests only — does NOT rebuild the app
#   yarn ci:local:expo54:e2e:ios --build-only        # build Detox app, skip tests
#
# From apps/ExpoApp54: yarn ci:local:e2e:ios [--flags]
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_PATH="${REPO_ROOT}/apps/ExpoApp54"
IOS_PATH="${APP_PATH}/ios"
CLI_CODEGEN="${REPO_ROOT}/packages/cli/dist/main.js"

SKIP_INSTALL=false
SKIP_BREW=false
TEST_ONLY=false
REBUILD_ONLY=false
BUILD_ONLY=false
CLEAN_IOS=false

for arg in "$@"; do
  case "$arg" in
    --) ;;
    --skip-install) SKIP_INSTALL=true ;;
    --skip-brew) SKIP_BREW=true ;;
    --test-only) TEST_ONLY=true ;;
    --rebuild) REBUILD_ONLY=true; SKIP_INSTALL=true; SKIP_BREW=true ;;
    --build-only) BUILD_ONLY=true ;;
    --clean-ios) CLEAN_IOS=true ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Run with --help for usage." >&2
      exit 1
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script must run on macOS (iOS Simulator + Xcode required)." >&2
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild not found. Install Xcode and select it with xcode-select." >&2
  exit 1
fi

echo "==> Xcode: $(xcodebuild -version | head -1)"
echo "==> Repo:  ${REPO_ROOT}"
echo "==> App:   ${APP_PATH}"

cd "${REPO_ROOT}"

if [[ "${SKIP_INSTALL}" == "false" && "${TEST_ONLY}" == "false" ]]; then
  echo "==> yarn install (DETOX_DISABLE_POSTINSTALL=1, same as CI setup)"
  DETOX_DISABLE_POSTINSTALL=1 yarn install

  echo "==> yarn build (packages, same as CI setup)"
  yarn build
fi

if [[ "${SKIP_BREW}" == "false" && "${TEST_ONLY}" == "false" ]]; then
  if ! command -v applesimutils >/dev/null 2>&1; then
    echo "==> Installing applesimutils (Detox iOS simulator helper)"
    brew tap wix/brew
    brew install applesimutils
  else
    echo "==> applesimutils already installed: $(command -v applesimutils)"
  fi
fi

if [[ "${CLEAN_IOS}" == "true" ]]; then
  echo "==> Clean iOS artifacts (Pods + build)"
  rm -rf "${IOS_PATH}/Pods" "${IOS_PATH}/build"
fi

should_build=false
if [[ "${TEST_ONLY}" == "false" ]]; then
  should_build=true
fi

if [[ "${should_build}" == "true" && "${SKIP_INSTALL}" == "false" ]]; then
  if [[ ! -f "${CLI_CODEGEN}" ]]; then
    echo "==> CLI not built; running yarn build"
    yarn build
  fi

  echo "==> brownfield codegen + Expo iOS prebuild (ExpoApp54)"
  (cd "${APP_PATH}" && node "${CLI_CODEGEN}" codegen && yarn expo prebuild --platform ios --no-install)

  echo "==> pod install"
  (cd "${IOS_PATH}" && pod install)

  echo "==> Detox iOS postinstall (single run, avoids monorepo race)"
  node "${APP_PATH}/node_modules/detox/scripts/postinstall.js"
elif [[ "${REBUILD_ONLY}" == "true" ]]; then
  echo "==> --rebuild: skipping install/prebuild/pods; rebuilding Detox app only"
fi

XCODE_ENV_UPDATES="${IOS_PATH}/.xcode.env.updates"
if [[ "${should_build}" == "true" && ! -f "${XCODE_ENV_UPDATES}" ]]; then
  echo "==> Missing ${XCODE_ENV_UPDATES}; running brownfield codegen + expo prebuild"
  (cd "${APP_PATH}" && node "${CLI_CODEGEN}" codegen && yarn expo prebuild --platform ios --no-install)
fi

if [[ "${should_build}" == "true" ]]; then
  echo "==> Detox build (iOS Simulator, embeds main.jsbundle for E2E)"
  (cd "${APP_PATH}" && yarn e2e:build:ios)
  DETOX_APP="${IOS_PATH}/build/Build/Products/Debug-iphonesimulator/ExpoApp54.app"
  if [[ ! -f "${DETOX_APP}/main.jsbundle" ]]; then
    echo "error: ${DETOX_APP}/main.jsbundle missing after Detox build." >&2
    echo "E2E needs an embedded bundle (Metro is not started in CI or local Detox runs)." >&2
    echo "Re-run without --rebuild so prebuild creates ios/.xcode.env.updates, then rebuild." >&2
    exit 1
  fi
elif [[ "${TEST_ONLY}" == "true" ]]; then
  echo "==> --test-only: using existing ios/build binary (run --rebuild or full CI to rebuild)"
fi

if [[ "${BUILD_ONLY}" == "false" ]]; then
  echo "==> Detox test (iOS Simulator, embedded JS bundle — Metro not required)"
  (cd "${APP_PATH}" && yarn e2e:test:ios)
fi

echo "==> Done."
