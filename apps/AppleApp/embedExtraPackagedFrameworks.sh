#!/bin/sh

set -eu

PACKAGE_DIR="${PROJECT_DIR}/package"
FRAMEWORKS_DIR="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"
INPUT_FILE_LIST="${SCRIPT_INPUT_FILE_LIST_0:-}"

if [ ! -d "${PACKAGE_DIR}" ] || [ ! -d "${FRAMEWORKS_DIR}" ]; then
  exit 0
fi

select_slice_dir() {
  xcframework_path="$1"
  want_simulator="$2"

  for candidate in "${xcframework_path}"/*; do
    [ -d "${candidate}" ] || continue

    if ! find "${candidate}" -maxdepth 1 -type d -name '*.framework' | grep -q .; then
      continue
    fi

    case "$(basename "${candidate}")" in
      *simulator*)
        if [ "${want_simulator}" = "yes" ]; then
          printf '%s\n' "${candidate}"
          return 0
        fi
        ;;
      *)
        if [ "${want_simulator}" = "no" ]; then
          printf '%s\n' "${candidate}"
          return 0
        fi
        ;;
    esac
  done

  return 1
}

sign_framework_if_needed() {
  framework_path="$1"

  case "${PLATFORM_NAME:-}" in
    *simulator*)
      return 0
      ;;
  esac

  if [ "${CODE_SIGNING_ALLOWED:-NO}" != "YES" ]; then
    return 0
  fi

  sign_identity="${EXPANDED_CODE_SIGN_IDENTITY:--}"
  /usr/bin/codesign --force --sign "${sign_identity}" --timestamp=none --preserve-metadata=identifier,entitlements,flags --generate-entitlement-der "${framework_path}"
}

is_dynamic_framework_binary() {
  framework_binary="$1"
  file_output="$(file "${framework_binary}")"

  case "${file_output}" in
    *"dynamically linked shared library"*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

case "${PLATFORM_NAME:-}" in
  *simulator*)
    want_simulator="yes"
    ;;
  *)
    want_simulator="no"
    ;;
esac

if [ -n "${INPUT_FILE_LIST}" ] && [ -f "${INPUT_FILE_LIST}" ]; then
  xcframework_paths="$(grep -E '\.xcframework$' "${INPUT_FILE_LIST}" || true)"
else
  xcframework_paths="$(find "${PACKAGE_DIR}" -maxdepth 1 -type d -name '*.xcframework' | sort)"
fi

printf '%s\n' "${xcframework_paths}" | while IFS= read -r xcframework_path; do
  [ -d "${xcframework_path}" ] || continue

  framework_name="$(basename "${xcframework_path}" .xcframework)"
  destination_path="${FRAMEWORKS_DIR}/${framework_name}.framework"

  if [ -e "${destination_path}" ]; then
    rm -rf "${destination_path}"
  fi

  slice_dir="$(select_slice_dir "${xcframework_path}" "${want_simulator}" || true)"

  if [ -z "${slice_dir}" ]; then
    continue
  fi

  framework_path="$(find "${slice_dir}" -maxdepth 1 -type d -name '*.framework' | head -n 1)"

  if [ -z "${framework_path}" ]; then
    continue
  fi

  framework_binary="${framework_path}/${framework_name}"

  if [ ! -f "${framework_binary}" ] || ! is_dynamic_framework_binary "${framework_binary}"; then
    continue
  fi

  cp -R "${framework_path}" "${destination_path}"
  sign_framework_if_needed "${destination_path}"
done
