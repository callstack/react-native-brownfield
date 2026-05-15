#!/usr/bin/env bash
#
# Run Script Build Phase invoked by the "Brownfield Apple App" target after
# the standard "Embed Frameworks" phase.
#
# When the host RN project is RockApp, the dynamic BrownfieldLib.dylib
# produced by `rock package:ios` has @rpath load commands for
# React.framework and ReactNativeDependencies.framework. They must be
# embedded in the .app bundle or the app crashes on launch with
# "Library not loaded: @rpath/React.framework/React".
#
# `prepareXCFrameworks.js --appName RockApp` drops these xcframeworks into
# `package/`. For Vanilla / Expo flavors they are absent (React core is
# statically linked into BrownfieldLib), so this script is a no-op then.

set -euo pipefail

PACKAGE_DIR="${SRCROOT}/package"
DEST_DIR="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"

EXTRA_XCFRAMEWORKS=(
  "React.xcframework"
  "ReactNativeDependencies.xcframework"
)

if [[ "${PLATFORM_NAME}" == iphonesimulator* || "${PLATFORM_NAME}" == macosx* ]]; then
  PRIMARY_SLICE="ios-arm64_x86_64-simulator"
  FALLBACK_SLICES=("ios-arm64-simulator")
else
  PRIMARY_SLICE="ios-arm64"
  FALLBACK_SLICES=("ios-arm64_x86_64-maccatalyst")
fi

resolve_slice_dir() {
  local xcframework_path="$1"
  for candidate in "${PRIMARY_SLICE}" "${FALLBACK_SLICES[@]}"; do
    if [[ -d "${xcframework_path}/${candidate}" ]]; then
      echo "${xcframework_path}/${candidate}"
      return 0
    fi
  done
  return 1
}

mkdir -p "${DEST_DIR}"

for xcframework in "${EXTRA_XCFRAMEWORKS[@]}"; do
  XC_PATH="${PACKAGE_DIR}/${xcframework}"
  if [[ ! -d "${XC_PATH}" ]]; then
    echo "note: ${xcframework} not present in ${PACKAGE_DIR}, skipping (expected for Vanilla/Expo flavors)"
    continue
  fi

  framework_name="$(basename "${xcframework}" .xcframework)"
  if ! slice_dir="$(resolve_slice_dir "${XC_PATH}")"; then
    echo "warning: no compatible slice for platform ${PLATFORM_NAME} in ${xcframework}; skipping"
    continue
  fi

  src_framework="${slice_dir}/${framework_name}.framework"
  if [[ ! -d "${src_framework}" ]]; then
    echo "warning: ${src_framework} is missing; skipping"
    continue
  fi

  dest_framework="${DEST_DIR}/${framework_name}.framework"
  echo "Embedding ${framework_name}.framework from ${slice_dir}"
  rm -rf "${dest_framework}"
  cp -R "${src_framework}" "${dest_framework}"

  if [[ "${EXPANDED_CODE_SIGN_IDENTITY:-}" != "" ]]; then
    /usr/bin/codesign --force --sign "${EXPANDED_CODE_SIGN_IDENTITY}" \
      ${OTHER_CODE_SIGN_FLAGS:-} \
      --preserve-metadata=identifier,entitlements,flags \
      "${dest_framework}"
  fi
done
