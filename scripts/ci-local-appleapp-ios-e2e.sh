#!/usr/bin/env bash
# Local-only Detox E2E for apps/AppleApp (mirrors CI ios-appleapp-vanilla / ios-appleapp-expo jobs).
#
# Usage (from repo root):
#   yarn ci:local:appleapp:e2e:ios
#   yarn ci:local:appleapp:e2e:ios --variant expo56
#   yarn ci:local:appleapp:e2e:ios --variant expo57
#   yarn ci:local:appleapp:e2e:ios --clean-ios
#   yarn ci:local:appleapp:e2e:ios --skip-install
#   yarn ci:local:appleapp:e2e:ios --rebuild
#   yarn ci:local:appleapp:e2e:ios --test-only
#   yarn ci:local:appleapp:e2e:ios --build-only
#   yarn ci:local:appleapp:e2e:ios --no-restore-pods   # keep E2E Pods.xcodeproj patches after exit
#
# Local runs auto-run `pod install` on exit to restore Brownfield pod Debug settings (vanilla RN host).
# From apps/AppleApp: yarn ci:local:e2e:ios [--flags]
#   yarn ci:local:e2e:ios:expo56 / yarn ci:local:e2e:ios:expo57
#
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/ci-local-ios-e2e-common.sh"

REPO_ROOT="$(ci_local_e2e_repo_root)"
APPLE_APP_PATH="${REPO_ROOT}/apps/AppleApp"
VARIANT="vanilla"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --) shift; break ;;
    --variant=*) VARIANT="${1#*=}"; shift ;;
    --variant)
      VARIANT="${2:?--variant requires a value (vanilla, expo56, or expo57)}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,15p' "$0"
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

ci_local_e2e_parse_common_flags "$@"
ci_local_e2e_require_macos

resolve_variant() {
  node <<NODE
const { getAppleAppDetoxVariant } = require('${REPO_ROOT}/apps/brownfield-example-shared-tests/detox-appleapp-variants.cjs');
const variant = getAppleAppDetoxVariant('${VARIANT}');
console.log([
  variant.xcframeworkApp,
  variant.configuration,
  variant.e2eBuildScript,
  variant.e2eTestScript,
].join('|'));
NODE
}

IFS='|' read -r XCFRAMEWORK_APP E2E_CONFIGURATION E2E_BUILD_SCRIPT E2E_TEST_SCRIPT < <(resolve_variant)
RN_PROJECT_PATH="${REPO_ROOT}/apps/${XCFRAMEWORK_APP}"
RN_PROJECT_IOS_PATH="${RN_PROJECT_PATH}/ios"

echo "==> Xcode: $(xcodebuild -version | head -1)"
echo "==> Repo:  ${REPO_ROOT}"
echo "==> Variant: ${VARIANT} (${XCFRAMEWORK_APP})"
echo "==> AppleApp: ${APPLE_APP_PATH}"

cd "${REPO_ROOT}"
ci_local_e2e_install_deps "${REPO_ROOT}" "${SKIP_INSTALL}" "${TEST_ONLY}"
ci_local_e2e_install_applesimutils "${SKIP_BREW}" "${TEST_ONLY}"

if [[ "${CLEAN_IOS}" == "true" ]]; then
  echo "==> Clean iOS artifacts (${XCFRAMEWORK_APP} Pods/build + AppleApp build)"
  rm -rf "${RN_PROJECT_IOS_PATH}/Pods" "${RN_PROJECT_IOS_PATH}/build" "${APPLE_APP_PATH}/build" "${APPLE_APP_PATH}/package"
fi

if ci_local_e2e_should_build "${TEST_ONLY}" && [[ "${REBUILD_ONLY}" != "true" ]]; then
  if [[ "${VARIANT}" == "vanilla" ]]; then
    echo "==> brownfield codegen (RNApp)"
    (cd "${RN_PROJECT_PATH}" && yarn codegen)

    echo "==> pod install (RNApp — build RN from source for RNScreens)"
    (cd "${RN_PROJECT_IOS_PATH}" && RCT_USE_PREBUILT_RNCORE=0 pod install)
    ci_local_e2e_apply_brownfield_debug_pod_settings "${RN_PROJECT_IOS_PATH}"
  fi

  echo "==> Package ${XCFRAMEWORK_APP} XCFramework for AppleApp"
  (cd "${RN_PROJECT_PATH}" && yarn brownfield:package:ios)

  echo "==> Copy XCFrameworks into AppleApp/package"
  (cd "${APPLE_APP_PATH}" && node prepareXCFrameworks.js --appName "${XCFRAMEWORK_APP}")

  ci_local_e2e_run_detox_postinstall "${APPLE_APP_PATH}"
elif [[ "${REBUILD_ONLY}" == "true" ]]; then
  echo "==> --rebuild: skipping pods/package; rebuilding Detox app only"
fi

if ci_local_e2e_should_build "${TEST_ONLY}"; then
  echo "==> Detox build (AppleApp ${VARIANT}, iOS Simulator)"
  (cd "${APPLE_APP_PATH}" && yarn "${E2E_BUILD_SCRIPT}")

  echo "==> Verify embedded JS bundle in BrownfieldLib (E2E — Metro not required)"
  PRODUCTS_DIR="${APPLE_APP_PATH}/build/Build/Products/${E2E_CONFIGURATION}-iphonesimulator"
  APP_PATH="$(find "${PRODUCTS_DIR}" -maxdepth 1 -name '*.app' -print -quit)"
  EXECUTABLE_PATH="${APP_PATH}/$(basename "${APP_PATH}" .app)"
  if [[ ! -f "${EXECUTABLE_PATH}" ]]; then
    echo "error: ${EXECUTABLE_PATH} missing — host app target produced an invalid .app (no bundle executable)." >&2
    exit 1
  fi
  BUNDLE_PATH="${APP_PATH}/Frameworks/BrownfieldLib.framework/main.jsbundle"
  if [[ ! -f "${BUNDLE_PATH}" ]]; then
    echo "error: ${BUNDLE_PATH} missing — package ${XCFRAMEWORK_APP} first (see ci-local-appleapp-ios-e2e.sh)." >&2
    exit 1
  fi
  echo "App executable OK: ${EXECUTABLE_PATH} ($(wc -c < "${EXECUTABLE_PATH}") bytes)"
  echo "Embedded bundle OK: ${BUNDLE_PATH} ($(wc -c < "${BUNDLE_PATH}") bytes)"
elif [[ "${TEST_ONLY}" == "true" ]]; then
  echo "==> --test-only: using existing AppleApp/build binary"
fi

if [[ "${BUILD_ONLY}" == "false" ]]; then
  echo "==> Detox test (AppleApp ${VARIANT}, iOS Simulator)"
  (cd "${APPLE_APP_PATH}" && yarn "${E2E_TEST_SCRIPT}")
fi

echo "==> Done."
