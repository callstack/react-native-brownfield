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
  NO_RESTORE_PODS=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --) shift; break ;;
      --skip-install) SKIP_INSTALL=true; shift ;;
      --skip-brew) SKIP_BREW=true; shift ;;
      --test-only) TEST_ONLY=true; shift ;;
      --rebuild) REBUILD_ONLY=true; SKIP_INSTALL=true; SKIP_BREW=true; shift ;;
      --build-only) BUILD_ONLY=true; shift ;;
      --clean-ios) CLEAN_IOS=true; shift ;;
      --no-restore-pods)
        NO_RESTORE_PODS=true
        shift
        ;;
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
      brew trust --formula wix/brew/applesimutils 2>/dev/null || true
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

CI_LOCAL_E2E_IOS_PATHS_FOR_POD_RESTORE=()
CI_LOCAL_E2E_POD_RESTORE_TRAP_REGISTERED=0

ci_local_e2e_register_pod_settings_restore() {
  local ios_path="$1"
  local existing

  if [[ "${NO_RESTORE_PODS:-false}" == "true" ]] || [[ -n "${CI:-}" ]]; then
    return 0
  fi

  for existing in "${CI_LOCAL_E2E_IOS_PATHS_FOR_POD_RESTORE[@]}"; do
    if [[ "${existing}" == "${ios_path}" ]]; then
      return 0
    fi
  done

  CI_LOCAL_E2E_IOS_PATHS_FOR_POD_RESTORE+=("${ios_path}")

  if [[ "${CI_LOCAL_E2E_POD_RESTORE_TRAP_REGISTERED}" != "1" ]]; then
    trap ci_local_e2e_restore_tracked_pod_settings EXIT
    CI_LOCAL_E2E_POD_RESTORE_TRAP_REGISTERED=1
  fi
}

ci_local_e2e_restore_brownfield_debug_pod_settings() {
  local ios_path="$1"

  if [[ ! -f "${ios_path}/Podfile.lock" ]]; then
    return 0
  fi

  echo "==> Restore iOS Pods after E2E (pod install — resets Brownfield Debug pod settings)"
  (cd "${ios_path}" && pod install)
}

ci_local_e2e_restore_tracked_pod_settings() {
  local ios_path

  if [[ "${#CI_LOCAL_E2E_IOS_PATHS_FOR_POD_RESTORE[@]}" -eq 0 ]]; then
    return 0
  fi

  for ios_path in "${CI_LOCAL_E2E_IOS_PATHS_FOR_POD_RESTORE[@]}"; do
    ci_local_e2e_restore_brownfield_debug_pod_settings "${ios_path}"
  done
}

ci_local_e2e_ensure_xcodeproj_gem() {
  local app_root="$1"

  if [[ -f "${app_root}/Gemfile" ]]; then
    echo "==> bundle install (${app_root}) for xcodeproj"
    (cd "${app_root}" && bundle install --quiet)
    if (cd "${app_root}" && bundle exec ruby -e "require 'xcodeproj'" 2>/dev/null); then
      return 0
    fi
  fi

  if ruby -e "require 'xcodeproj'" 2>/dev/null; then
    return 0
  fi

  echo "==> gem install xcodeproj"
  gem install xcodeproj --no-document --version 1.25.1
}

ci_local_e2e_apply_brownfield_debug_pod_settings() {
  local ios_path="$1"
  local app_root="$(cd "${ios_path}/.." && pwd)"
  local pods_project="${ios_path}/Pods/Pods.xcodeproj"

  if [[ ! -d "${pods_project}" ]]; then
    echo "warning: ${pods_project} not found; skipping Brownfield Debug pod settings" >&2
    return 0
  fi

  ci_local_e2e_ensure_xcodeproj_gem "${app_root}"

  echo "==> Brownfield pods: disable Swift module interface for Debug E2E builds"

  if [[ -f "${app_root}/Gemfile" ]] \
    && (cd "${app_root}" && bundle exec ruby -e "require 'xcodeproj'" 2>/dev/null); then
    (cd "${app_root}" && bundle exec ruby - "${pods_project}" <<'RUBY'
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
    )
  else
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
  fi

  ci_local_e2e_register_pod_settings_restore "${ios_path}"
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
