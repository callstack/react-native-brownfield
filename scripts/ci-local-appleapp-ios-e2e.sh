#!/usr/bin/env bash
# Local-only Detox E2E for apps/AppleApp (mirrors the CI e2e-ios-appleapp job).
#
# Usage (from repo root):
#   yarn ci:local:appleapp:e2e:ios
#   yarn ci:local:appleapp:e2e:ios --clean-ios
#   yarn ci:local:appleapp:e2e:ios --skip-install
#   yarn ci:local:appleapp:e2e:ios --rebuild
#   yarn ci:local:appleapp:e2e:ios --test-only
#   yarn ci:local:appleapp:e2e:ios --build-only
#
# From apps/AppleApp: yarn ci:local:e2e:ios [--flags]
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RN_APP_PATH="${REPO_ROOT}/apps/RNApp"
RN_IOS_PATH="${RN_APP_PATH}/ios"
APPLE_APP_PATH="${REPO_ROOT}/apps/AppleApp"

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
      sed -n '2,12p' "$0"
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
echo "==> RNApp: ${RN_APP_PATH}"
echo "==> AppleApp: ${APPLE_APP_PATH}"

cd "${REPO_ROOT}"

if [[ "${SKIP_INSTALL}" == "false" && "${TEST_ONLY}" == "false" ]]; then
  echo "==> yarn install (DETOX_DISABLE_POSTINSTALL=1, same as CI setup)"
  DETOX_DISABLE_POSTINSTALL=1 yarn install

  echo "==> yarn build (packages, same as CI setup + prepare-ios)"
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
  echo "==> Clean iOS artifacts (RNApp Pods/build + AppleApp build)"
  rm -rf "${RN_IOS_PATH}/Pods" "${RN_IOS_PATH}/build" "${APPLE_APP_PATH}/build" "${APPLE_APP_PATH}/package"
fi

should_build=false
if [[ "${TEST_ONLY}" == "false" ]]; then
  should_build=true
fi

if [[ "${should_build}" == "true" && "${SKIP_INSTALL}" == "false" ]]; then
  echo "==> brownfield codegen (RNApp)"
  (cd "${RN_APP_PATH}" && yarn codegen)

  echo "==> pod install (RNApp — build RN from source for RNScreens)"
  (cd "${RN_IOS_PATH}" && RCT_USE_PREBUILT_RNCORE=0 pod install)

  echo "==> Package RNApp XCFramework for AppleApp"
  (cd "${RN_APP_PATH}" && yarn brownfield:package:ios)

  echo "==> Copy XCFrameworks into AppleApp/package"
  (cd "${APPLE_APP_PATH}" && node prepareXCFrameworks.js --appName RNApp)

  echo "==> Detox iOS postinstall (AppleApp)"
  node "${APPLE_APP_PATH}/node_modules/detox/scripts/postinstall.js"
elif [[ "${REBUILD_ONLY}" == "true" ]]; then
  echo "==> --rebuild: skipping install/pods/package; rebuilding Detox app only"
fi

if [[ "${should_build}" == "true" ]]; then
  echo "==> Detox build (AppleApp Vanilla, iOS Simulator)"
  (cd "${APPLE_APP_PATH}" && yarn e2e:build:ios)

  echo "==> Verify embedded JS bundle in BrownfieldLib (E2E — Metro not required)"
  PRODUCTS_DIR="${APPLE_APP_PATH}/build/Build/Products/Debug Vanilla-iphonesimulator"
  APP_PATH="$(find "${PRODUCTS_DIR}" -maxdepth 1 -name '*.app' -print -quit)"
  BUNDLE_PATH="${APP_PATH}/Frameworks/BrownfieldLib.framework/main.jsbundle"
  if [[ ! -f "${BUNDLE_PATH}" ]]; then
    echo "error: ${BUNDLE_PATH} missing — package RNApp first (see ci-local-appleapp-ios-e2e.sh)." >&2
    exit 1
  fi
  echo "Embedded bundle OK: ${BUNDLE_PATH} ($(wc -c < "${BUNDLE_PATH}") bytes)"
elif [[ "${TEST_ONLY}" == "true" ]]; then
  echo "==> --test-only: using existing AppleApp/build binary"
fi

if [[ "${BUILD_ONLY}" == "false" ]]; then
  echo "==> Detox test (AppleApp Vanilla, iOS Simulator)"
  (cd "${APPLE_APP_PATH}" && yarn e2e:test:ios)
fi

echo "==> Done."
