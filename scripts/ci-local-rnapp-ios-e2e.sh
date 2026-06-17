#!/usr/bin/env bash
# Mirrors the GitHub Actions "E2E iOS (RNApp)" job locally (setup + e2e-ios for apps/RNApp).
#
# Usage (from repo root):
#   yarn ci:local:rnapp:e2e:ios
#   yarn ci:local:rnapp:e2e:ios --clean-ios
#   yarn ci:local:rnapp:e2e:ios --skip-install      # deps already installed/built
#   yarn ci:local:rnapp:e2e:ios --rebuild           # Detox build + test (skip yarn install / pods)
#   yarn ci:local:rnapp:e2e:ios --test-only         # tests only — does NOT rebuild the app
#   yarn ci:local:rnapp:e2e:ios --build-only        # build Detox app, skip tests
#
# From apps/RNApp: yarn ci:local:e2e:ios [--flags]
#
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/ci-local-ios-e2e-common.sh"

REPO_ROOT="$(ci_local_e2e_repo_root)"
APP_PATH="${REPO_ROOT}/apps/RNApp"
IOS_PATH="${APP_PATH}/ios"

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  sed -n '2,9p' "$0"
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
  echo "==> brownfield codegen (RNApp)"
  (cd "${APP_PATH}" && yarn codegen)

  echo "==> pod install (RCT_USE_PREBUILT_RNCORE=0 — build RN from source for RNScreens)"
  (cd "${IOS_PATH}" && RCT_USE_PREBUILT_RNCORE=0 pod install)

  ci_local_e2e_run_detox_postinstall "${APP_PATH}"
elif [[ "${REBUILD_ONLY}" == "true" ]]; then
  echo "==> --rebuild: skipping install/pods; rebuilding Detox app only"
fi

if ci_local_e2e_should_build "${TEST_ONLY}"; then
  ci_local_e2e_run_detox_build "${APP_PATH}"
elif [[ "${TEST_ONLY}" == "true" ]]; then
  echo "==> --test-only: using existing ios/build binary (run without --test-only to rebuild)"
fi

if [[ "${BUILD_ONLY}" == "false" ]]; then
  ci_local_e2e_run_detox_test "${APP_PATH}"
fi

echo "==> Done."
