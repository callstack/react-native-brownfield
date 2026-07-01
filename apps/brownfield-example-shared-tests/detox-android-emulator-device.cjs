'use strict';

const { execSync } = require('node:child_process');

/** Matches reactivecircus/android-emulator-runner default when `avd-name` is omitted. */
const FALLBACK_AVD_NAME = 'test';

/**
 * Local AVD preference order. CI uses API 34 + Pixel 6 (`avd-name: test`); locally we pick
 * the closest installed match instead of the first name from `emulator -list-avds` (often an
 * old preview device like Nexus_4_API_36).
 */
const PREFERRED_LOCAL_AVD_NAMES = [
  'Pixel_4_API_34',
  'Pixel_6_Pro_API_33',
  'Pixel_4_API_33',
  'Pixel_9_Pro_XL',
];

function tryExec(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return '';
  }
}

function listAvdNames() {
  const out = tryExec('emulator -list-avds');
  if (!out) return [];
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isUndesirableLocalAvd(name) {
  return /nexus_4/i.test(name) || /_api_3[5-9](_|$)/i.test(name);
}

function pickPreferredAndroidEmulatorAvd(avds) {
  for (const preferred of PREFERRED_LOCAL_AVD_NAMES) {
    if (avds.includes(preferred)) {
      return preferred;
    }
  }

  const stable = avds.filter((name) => !isUndesirableLocalAvd(name));
  return stable[0] || avds[0] || FALLBACK_AVD_NAME;
}

function getRunningEmulatorAvdName() {
  const out = tryExec('adb emu avd name');
  if (!out) return '';
  return out.split('\n')[0].trim();
}

/**
 * AVD name for Detox `android.emulator` config.
 *
 * Override: `DETOX_DEVICE` or `DETOX_ANDROID_EMULATOR_AVD`.
 * Otherwise picks a stable local AVD (prefers API 34 Pixel), or `test` on CI.
 */
function getAndroidEmulatorAvdName() {
  const fromEnv =
    process.env.DETOX_DEVICE?.trim() ||
    process.env.DETOX_ANDROID_EMULATOR_AVD?.trim();
  if (fromEnv) return fromEnv;

  const avds = listAvdNames();
  return pickPreferredAndroidEmulatorAvd(avds);
}

function getAttachedAdbSerial() {
  return (
    process.env.ANDROID_SERIAL?.trim() ||
    process.env.ANDROID_ADB_SERIAL?.trim() ||
    ''
  );
}

/**
 * Detox device entry for AndroidApp E2E.
 *
 * CI uses reactivecircus/android-emulator-runner, which exports ANDROID_SERIAL for
 * the script phase. Prefer android.attached there so Detox does not cold-boot a
 * second emulator (that race produces endless `getprop sys.boot_completed` noise
 * and `adb: device 'emulator-5554' not found`).
 *
 * @returns {{ deviceKey: string, deviceConfig: { type: string, device: object } }}
 */
function resolveAndroidDetoxDevice() {
  const adbName = getAttachedAdbSerial();
  if (adbName) {
    return {
      deviceKey: 'android.attached',
      deviceConfig: {
        type: 'android.attached',
        device: { adbName },
      },
    };
  }

  return {
    deviceKey: 'android.emulator',
    deviceConfig: {
      type: 'android.emulator',
      device: { avdName: getAndroidEmulatorAvdName() },
    },
  };
}

module.exports = {
  FALLBACK_AVD_NAME,
  PREFERRED_LOCAL_AVD_NAMES,
  listAvdNames,
  pickPreferredAndroidEmulatorAvd,
  getRunningEmulatorAvdName,
  getAndroidEmulatorAvdName,
  getAttachedAdbSerial,
  resolveAndroidDetoxDevice,
};
