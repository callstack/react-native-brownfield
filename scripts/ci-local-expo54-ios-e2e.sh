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

source "$(dirname "${BASH_SOURCE[0]}")/ci-local-ios-e2e-common.sh"

REPO_ROOT="$(ci_local_e2e_repo_root)"
APP_PATH="${REPO_ROOT}/apps/ExpoApp54"
IOS_PATH="${APP_PATH}/ios"
CLI_CODEGEN="${REPO_ROOT}/packages/cli/dist/main.js"
APP_NAME="ExpoApp54"

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  sed -n '2,10p' "$0"
  exit 0
fi

ci_local_e2e_parse_common_flags "$@"
ci_local_e2e_require_macos
ci_local_e2e_print_header "${REPO_ROOT}" "${APP_PATH}"

cd "${REPO_ROOT}"
ci_local_e2e_install_deps "${REPO_ROOT}" "${SKIP_INSTALL}" "${TEST_ONLY}"
ci_local_e2e_install_applesimutils "${SKIP_BREW}" "${TEST_ONLY}"

if [[ "${CLEAN_IOS}" == "true" ]]; then
  echo "==> Clean iOS artifacts (Pods + build)"
  rm -rf "${IOS_PATH}/Pods" "${IOS_PATH}/build"
fi

if ci_local_e2e_should_build "${TEST_ONLY}" && [[ "${SKIP_INSTALL}" == "false" ]]; then
  if [[ ! -f "${CLI_CODEGEN}" ]]; then
    echo "==> CLI not built; running yarn build"
    yarn build
  fi

  echo "==> brownfield codegen + Expo iOS prebuild (${APP_NAME})"
  (cd "${APP_PATH}" && node "${CLI_CODEGEN}" codegen && yarn expo prebuild --platform ios --no-install)

  echo "==> pod install"
  (cd "${IOS_PATH}" && pod install)

  ci_local_e2e_run_detox_postinstall "${APP_PATH}"
elif [[ "${REBUILD_ONLY}" == "true" ]]; then
  echo "==> --rebuild: skipping install/prebuild/pods; rebuilding Detox app only"
fi

XCODE_ENV_UPDATES="${IOS_PATH}/.xcode.env.updates"
if ci_local_e2e_should_build "${TEST_ONLY}" && [[ ! -f "${XCODE_ENV_UPDATES}" ]]; then
  echo "==> Missing ${XCODE_ENV_UPDATES}; running brownfield codegen + expo prebuild"
  (cd "${APP_PATH}" && node "${CLI_CODEGEN}" codegen && yarn expo prebuild --platform ios --no-install)
fi

if ci_local_e2e_should_build "${TEST_ONLY}"; then
  ci_local_e2e_run_detox_build "${APP_PATH}"
  DETOX_APP="${IOS_PATH}/build/Build/Products/Debug-iphonesimulator/${APP_NAME}.app"
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
  ci_local_e2e_run_detox_test "${APP_PATH}"
fi

echo "==> Done."
