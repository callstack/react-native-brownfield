#!/usr/bin/env bash
# Runs a command while recording the full device logcat host-side (CI + local).
# Detox's own logcat artifact is filtered to the app pid and recorded on-device
# with `logcat -f`, which is killed before it flushes, so it drops the last few
# seconds before a failure and never contains system_server lines (ANRs).
#
# Usage: run-with-android-logcat.sh <output-file> <command> [args...]
set -uo pipefail

if (( $# < 2 )); then
  echo "usage: $0 <output-file> <command> [args...]" >&2
  exit 2
fi

LOGCAT_FILE="$1"
shift

ADB=(adb)
if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  ADB=(adb -s "${ANDROID_SERIAL}")
fi

mkdir -p "$(dirname "${LOGCAT_FILE}")"
"${ADB[@]}" logcat -v threadtime -b main,system,crash >"${LOGCAT_FILE}" 2>&1 &
logcat_pid=$!
echo "==> Recording device logcat to ${LOGCAT_FILE} (pid ${logcat_pid})"

"$@"
status=$?

kill "${logcat_pid}" 2>/dev/null || true
wait "${logcat_pid}" 2>/dev/null || true

exit "${status}"
