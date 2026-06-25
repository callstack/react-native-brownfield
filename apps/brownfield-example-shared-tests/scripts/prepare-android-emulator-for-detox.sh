#!/usr/bin/env bash
# Best-effort emulator prep before Detox Android E2E (CI + local).
# Collapses the notification shade and quiets first-boot setup prompts that can
# cover the app and make Detox report "The app seems to be idle".
set -euo pipefail

BOOT_TIMEOUT_SEC="${ANDROID_EMULATOR_BOOT_TIMEOUT_SEC:-180}"
ADB=(adb)
if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  ADB=(adb -s "${ANDROID_SERIAL}")
fi

adb_device_online() {
  if [[ -n "${ANDROID_SERIAL:-}" ]]; then
    adb devices | awk -v serial="${ANDROID_SERIAL}" '$1 == serial && $2 == "device" { found = 1 } END { exit !found }'
    return
  fi
  adb get-state >/dev/null 2>&1
}

echo "==> Waiting for Android device (timeout: ${BOOT_TIMEOUT_SEC}s, serial: ${ANDROID_SERIAL:-auto})"
"${ADB[@]}" wait-for-device

deadline=$((SECONDS + BOOT_TIMEOUT_SEC))
while (( SECONDS < deadline )); do
  if ! adb_device_online; then
    sleep 1
    continue
  fi

  boot="$("${ADB[@]}" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
  if [[ "${boot}" == "1" ]]; then
    echo "==> Android device booted"
    break
  fi
  sleep 1
done

if (( SECONDS >= deadline )); then
  echo "error: Android device did not finish booting within ${BOOT_TIMEOUT_SEC}s" >&2
  adb devices -l || true
  exit 1
fi

"${ADB[@]}" shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
"${ADB[@]}" shell wm dismiss-keyguard >/dev/null 2>&1 || true
"${ADB[@]}" shell cmd statusbar collapse >/dev/null 2>&1 || true
"${ADB[@]}" shell settings put global heads_up_notifications_enabled 0 >/dev/null 2>&1 || true
"${ADB[@]}" shell settings put secure user_setup_complete 1 >/dev/null 2>&1 || true
"${ADB[@]}" shell settings put secure tv_user_setup_complete 1 >/dev/null 2>&1 || true
