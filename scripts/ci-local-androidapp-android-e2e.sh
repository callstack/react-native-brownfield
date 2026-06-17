#!/usr/bin/env bash
# Local-only Detox E2E for apps/AndroidApp (mirrors CI android-androidapp-vanilla / expo jobs).
#
# Usage (from repo root):
#   yarn ci:local:androidapp:e2e:android
#   yarn ci:local:androidapp:e2e:android:expo55
#   yarn ci:local:androidapp:e2e:android --variant expo55
#   yarn ci:local:androidapp:e2e:android --skip-install
#   yarn ci:local:androidapp:e2e:android --rebuild
#   yarn ci:local:androidapp:e2e:android --test-only
#   yarn ci:local:androidapp:e2e:android --build-only
#   yarn ci:local:androidapp:e2e:android --avd Pixel_4_API_34
#
# Emulator: defaults to Pixel_4_API_34 when installed (matches CI API 34). Override with
# --avd or DETOX_DEVICE. Boots the chosen AVD automatically when none is running.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_APP_PATH="${REPO_ROOT}/apps/AndroidApp"
VARIANT="vanilla"
SKIP_INSTALL=false
TEST_ONLY=false
REBUILD_ONLY=false
BUILD_ONLY=false
DETOX_AVD=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --) shift; break ;;
    --variant=*) VARIANT="${1#*=}"; shift ;;
    --variant)
      VARIANT="${2:?--variant requires a value (vanilla or expo55)}"
      shift 2
      ;;
    --avd=*) DETOX_AVD="${1#*=}"; shift ;;
    --avd)
      DETOX_AVD="${2:?--avd requires an AVD name (see: emulator -list-avds)}"
      shift 2
      ;;
    --skip-install) SKIP_INSTALL=true; shift ;;
    --test-only) TEST_ONLY=true; shift ;;
    --rebuild) REBUILD_ONLY=true; SKIP_INSTALL=true; shift ;;
    --build-only) BUILD_ONLY=true; shift ;;
    -h|--help)
      sed -n '2,17p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

resolve_detox_avd() {
  DETOX_DEVICE="${DETOX_AVD}" node <<NODE
const {
  getAndroidEmulatorAvdName,
  getRunningEmulatorAvdName,
  listAvdNames,
} = require('${REPO_ROOT}/apps/brownfield-example-shared-tests/detox-android-emulator-device.cjs');

const expected = getAndroidEmulatorAvdName();
const running = getRunningEmulatorAvdName();
const installed = listAvdNames();

console.log([expected, running, installed.join(',')].join('|'));
NODE
}

start_detox_emulator() {
  local avd="$1"
  local installed="$2"

  if [[ ",${installed}," != *",${avd},"* ]]; then
    echo "error: AVD '${avd}' is not installed. Available: ${installed}" >&2
    exit 1
  fi

  echo "==> Starting emulator: ${avd}"
  nohup emulator -avd "${avd}" -no-boot-anim -no-snapshot-load >/tmp/detox-emulator.log 2>&1 &
  bash "${REPO_ROOT}/apps/brownfield-example-shared-tests/scripts/prepare-android-emulator-for-detox.sh"
}

ensure_android_emulator() {
  if [[ -n "${DETOX_AVD}" ]]; then
    export DETOX_DEVICE="${DETOX_AVD}"
  fi

  IFS='|' read -r EXPECTED_AVD RUNNING_AVD INSTALLED_AVDS < <(resolve_detox_avd)
  export DETOX_DEVICE="${DETOX_DEVICE:-${EXPECTED_AVD}}"

  echo "==> Detox AVD:  ${DETOX_DEVICE} (installed: ${INSTALLED_AVDS:-none})"

  if [[ -n "${RUNNING_AVD}" && "${RUNNING_AVD}" != "${DETOX_DEVICE}" ]]; then
    echo "error: ${RUNNING_AVD} is running but Detox expects ${DETOX_DEVICE}." >&2
    echo "Stop it with: adb emu kill" >&2
    echo "Then re-run (the script will start ${DETOX_DEVICE} automatically)." >&2
    exit 1
  fi

  if [[ -z "${RUNNING_AVD}" ]]; then
    start_detox_emulator "${DETOX_DEVICE}" "${INSTALLED_AVDS}"
  fi
}

resolve_variant() {
  node <<NODE
const { getAndroidAppDetoxVariant } = require('${REPO_ROOT}/apps/brownfield-example-shared-tests/detox-androidapp-variants.cjs');
const variant = getAndroidAppDetoxVariant('${VARIANT}');
console.log([
  variant.rnAppDir,
  variant.rnMavenPath,
  variant.e2eBuildScript,
  variant.e2eTestScript,
].join('|'));
NODE
}

IFS='|' read -r RN_APP_DIR RN_MAVEN_PATH E2E_BUILD_SCRIPT E2E_TEST_SCRIPT < <(resolve_variant)
RN_PROJECT_PATH="${REPO_ROOT}/apps/${RN_APP_DIR}"

echo "==> Repo:       ${REPO_ROOT}"
echo "==> Variant:    ${VARIANT} (${RN_APP_DIR})"
echo "==> AndroidApp: ${ANDROID_APP_PATH}"

if [[ "${SKIP_INSTALL}" == "false" && "${TEST_ONLY}" == "false" ]]; then
  echo "==> yarn install (DETOX_DISABLE_POSTINSTALL=1, same as CI setup)"
  (cd "${REPO_ROOT}" && DETOX_DISABLE_POSTINSTALL=1 yarn install)

  echo "==> yarn build (packages, same as CI setup)"
  (cd "${REPO_ROOT}" && yarn build)
fi

if [[ "${TEST_ONLY}" == "false" && "${REBUILD_ONLY}" != "true" ]]; then
  echo "==> Publish Brownfield Gradle plugin to Maven Local"
  (cd "${REPO_ROOT}" && yarn brownfield:plugin:publish:local)

  if [[ "${VARIANT}" == expo* ]]; then
    echo "==> expo prebuild (${RN_APP_DIR})"
    (cd "${RN_PROJECT_PATH}" && yarn expo prebuild --platform android)
    (cd "${RN_PROJECT_PATH}" && yarn brownfield:prepare:android:ci)
  fi

  echo "==> Package and publish ${RN_APP_DIR} AAR"
  (cd "${RN_PROJECT_PATH}" && yarn brownfield:package:android && yarn brownfield:publish:android)

  echo "==> Verify embedded JS bundle in release AAR (Metro not required)"
  AAR_PATH="${HOME}/.m2/repository/${RN_MAVEN_PATH}/0.0.1-SNAPSHOT/brownfieldlib-0.0.1-SNAPSHOT-release.aar"
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "${TMP_DIR}"' EXIT
  unzip -q "${AAR_PATH}" -d "${TMP_DIR}"
  BUNDLE_PATH="$(find "${TMP_DIR}/assets" -name 'index.android.bundle' -print -quit)"
  if [[ -z "${BUNDLE_PATH}" ]]; then
    echo "error: index.android.bundle missing from ${AAR_PATH}" >&2
    exit 1
  fi
  echo "Embedded bundle OK: ${BUNDLE_PATH} ($(wc -c < "${BUNDLE_PATH}") bytes)"
  rm -rf "${TMP_DIR}"
  trap - EXIT

  echo "==> Detox Android postinstall"
  node "${ANDROID_APP_PATH}/node_modules/detox/scripts/postinstall.js"
elif [[ "${REBUILD_ONLY}" == "true" ]]; then
  echo "==> --rebuild: skipping AAR packaging; rebuilding Detox APK only"
fi

if [[ "${TEST_ONLY}" == "false" ]]; then
  echo "==> Detox build (AndroidApp ${VARIANT}, release APK)"
  (cd "${ANDROID_APP_PATH}" && yarn "${E2E_BUILD_SCRIPT}")
elif [[ "${TEST_ONLY}" == "true" ]]; then
  echo "==> --test-only: using existing AndroidApp APK"
fi

if [[ "${BUILD_ONLY}" == "false" ]]; then
  ensure_android_emulator

  echo "==> Prepare Android emulator for Detox"
  bash "${REPO_ROOT}/apps/brownfield-example-shared-tests/scripts/prepare-android-emulator-for-detox.sh"

  echo "==> Detox test (AndroidApp ${VARIANT}, emulator — Metro not required)"
  (cd "${ANDROID_APP_PATH}" && DETOX_DEVICE="${DETOX_DEVICE}" yarn "${E2E_TEST_SCRIPT}")
fi

echo "==> Done."
