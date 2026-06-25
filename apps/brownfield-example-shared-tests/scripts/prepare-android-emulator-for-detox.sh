#!/usr/bin/env bash
# Best-effort emulator prep before Detox Android E2E (CI + local).
# Collapses the notification shade and quiets first-boot setup prompts that can
# cover the app and make Detox report "The app seems to be idle".
set -euo pipefail

adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'

adb shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
adb shell wm dismiss-keyguard >/dev/null 2>&1 || true
adb shell cmd statusbar collapse >/dev/null 2>&1 || true
adb shell settings put global heads_up_notifications_enabled 0 >/dev/null 2>&1 || true
adb shell settings put global window_animation_scale 0 >/dev/null 2>&1 || true
adb shell settings put global transition_animation_scale 0 >/dev/null 2>&1 || true
adb shell settings put global animator_duration_scale 0 >/dev/null 2>&1 || true
adb shell settings put secure user_setup_complete 1 >/dev/null 2>&1 || true
adb shell settings put secure tv_user_setup_complete 1 >/dev/null 2>&1 || true
