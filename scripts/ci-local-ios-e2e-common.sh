#!/usr/bin/env bash
# Shared helpers for local Detox iOS E2E scripts (sourced, not executed directly).

ci_local_e2e_repo_root() {
  cd "$(dirname "${BASH_SOURCE[1]}")/.." && pwd
}

ci_local_e2e_require_macos() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "This script must run on macOS (iOS Simulator + Xcode required)." >&2
    exit 1
  fi

  if ! command -v xcodebuild >/dev/null 2>&1; then
    echo "xcodebuild not found. Install Xcode and select it with xcode-select." >&2
    exit 1
  fi
}

ci_local_e2e_parse_common_flags() {
  SKIP_INSTALL=false
  SKIP_BREW=false
  TEST_ONLY=false
  REBUILD_ONLY=false
  BUILD_ONLY=false
  CLEAN_IOS=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --) shift; break ;;
      --skip-install) SKIP_INSTALL=true; shift ;;
      --skip-brew) SKIP_BREW=true; shift ;;
      --test-only) TEST_ONLY=true; shift ;;
      --rebuild) REBUILD_ONLY=true; SKIP_INSTALL=true; SKIP_BREW=true; shift ;;
      --build-only) BUILD_ONLY=true; shift ;;
      --clean-ios) CLEAN_IOS=true; shift ;;
      *)
        return 0
        ;;
    esac
  done
}

ci_local_e2e_print_header() {
  local repo_root="$1"
  local app_path="$2"
  echo "==> Xcode: $(xcodebuild -version | head -1)"
  echo "==> Repo:  ${repo_root}"
  echo "==> App:   ${app_path}"
}

ci_local_e2e_install_deps() {
  local repo_root="$1"
  local skip_install="$2"
  local test_only="$3"

  if [[ "${skip_install}" == "false" && "${test_only}" == "false" ]]; then
    echo "==> yarn install (DETOX_DISABLE_POSTINSTALL=1, same as CI setup)"
    (cd "${repo_root}" && DETOX_DISABLE_POSTINSTALL=1 yarn install)

    echo "==> yarn build (packages, same as CI setup)"
    (cd "${repo_root}" && yarn build)
  fi
}

ci_local_e2e_install_applesimutils() {
  local skip_brew="$1"
  local test_only="$2"

  if [[ "${skip_brew}" == "false" && "${test_only}" == "false" ]]; then
    if ! command -v applesimutils >/dev/null 2>&1; then
      echo "==> Installing applesimutils (Detox iOS simulator helper)"
      brew tap wix/brew
      brew install applesimutils
    else
      echo "==> applesimutils already installed: $(command -v applesimutils)"
    fi
  fi
}

ci_local_e2e_should_build() {
  local test_only="$1"
  [[ "${test_only}" == "false" ]]
}

ci_local_e2e_run_detox_postinstall() {
  local app_path="$1"
  echo "==> Detox iOS postinstall (single run, avoids monorepo race)"
  # Detox postinstall patches android/ relative to cwd; run from the app root (same as CI AppleApp step).
  (cd "${app_path}" && node node_modules/detox/scripts/postinstall.js)
}

ci_local_e2e_apply_brownfield_debug_pod_settings() {
  local ios_path="$1"
  local pods_project="${ios_path}/Pods/Pods.xcodeproj"

  if [[ ! -d "${pods_project}" ]]; then
    echo "warning: ${pods_project} not found; skipping Brownfield Debug pod settings" >&2
    return 0
  fi

  echo "==> Brownfield pods: disable Swift module interface for Debug E2E builds"
  ruby - "${pods_project}" <<'RUBY'
require 'xcodeproj'

project = Xcodeproj::Project.open(ARGV[0])
brownfield_pods = %w[Brownie BrownfieldNavigation ReactBrownfield]

project.targets.each do |target|
  next unless brownfield_pods.include?(target.name)

  target.build_configurations.each do |config|
    next unless config.name == 'Debug'

    config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'NO'
    config.build_settings['SWIFT_EMIT_MODULE_INTERFACE'] = 'NO'
  end
end

project.save
RUBY
}

ci_local_e2e_ensure_ios_xcode_env_updates() {
  local ios_path="$1"
  local file="${ios_path}/.xcode.env.updates"
  local marker='# Detox / CI embedded bundle'

  if [[ -f "${file}" ]] && grep -q "${marker}" "${file}"; then
    return 0
  fi

  # Detox sets FORCE_BUNDLING=1, but Expo Debug also sets SKIP_BUNDLING=1 in the Xcode
  # bundle script. Unset SKIP_BUNDLING when FORCE_BUNDLING is set so main.jsbundle is embedded.
  cat > "${file}" <<'EOF'
# Detox / CI embedded bundle
# When FORCE_BUNDLING=1 (see apps/*/.detoxrc.cjs), embed JS for simulator E2E without Metro.
if [[ -n "$FORCE_BUNDLING" ]]; then
  unset SKIP_BUNDLING
fi
EOF
  echo "==> Wrote ${file} for Detox embedded bundle builds"
}

ci_local_e2e_run_detox_build() {
  local app_path="$1"
  echo "==> Detox build (iOS Simulator, embeds main.jsbundle for E2E)"
  (cd "${app_path}" && yarn e2e:build:ios)
}

ci_local_e2e_run_detox_test() {
  local app_path="$1"
  echo "==> Detox test (iOS Simulator, embedded JS bundle — Metro not required)"
  (cd "${app_path}" && yarn e2e:test:ios)
}
