'use strict';

const { execSync } = require('node:child_process');

/** Used when simctl is unavailable (e.g. CI without Xcode) or lists no iPhones. */
const FALLBACK_DEVICE_TYPE = 'iPhone 16';

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

function listSimctlIphoneDeviceTypes() {
  for (const command of [
    // Newer Xcode releases may change support for the `available` suffix.
    'xcrun simctl list devicetypes available',
    'xcrun simctl list devicetypes',
  ]) {
    const out = tryExec(command);
    if (!out) continue;

    const types = [];
    for (const line of out.split('\n')) {
      const m = line.match(/^\s*(iPhone [^(\n]+?)\s*\(/);
      if (m) types.push(m[1].trim());
    }
    if (types.length > 0) return types;
  }

  return [];
}

function listSimctlAvailableIphoneDevices() {
  const out = tryExec('xcrun simctl list devices available');
  if (!out) return [];

  const devices = [];
  for (const line of out.split('\n')) {
    // Example: "    iPhone 16 Pro (XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX) (Shutdown)"
    const m = line.match(/^\s*(iPhone [^(]+)\s+\([0-9A-F-]+\)\s+\((?:Shutdown|Booted)\)\s*$/i);
    if (m) devices.push(m[1].trim());
  }
  return devices;
}

function scoreDeviceType(name) {
  const generation = name.match(/iPhone\s+(\d+)/i);
  if (!generation) return -1;
  let score = parseInt(generation[1], 10) * 10;
  if (/pro max/i.test(name)) score += 3;
  else if (/\bpro\b/i.test(name)) score += 2;
  else if (/plus/i.test(name)) score += 1;
  else if (/mini/i.test(name)) score += 0.5;
  return score;
}

/**
 * Device `type` string for Detox `ios.simulator` config (matches Xcode / simctl names).
 *
 * Override: `DETOX_DEVICE` or `DETOX_IOS_SIMULATOR_DEVICE` (e.g. same name as in Xcode’s
 * “Product → Destination” list).
 *
 * Otherwise picks the highest-numbered iPhone \* device type reported by simctl.
 */
function getIosSimulatorDeviceType() {
  const fromEnv =
    process.env.DETOX_DEVICE?.trim() ||
    process.env.DETOX_IOS_SIMULATOR_DEVICE?.trim();
  if (fromEnv) return fromEnv;

  const types = [
    ...listSimctlIphoneDeviceTypes(),
    ...listSimctlAvailableIphoneDevices(),
  ];

  let best = null;
  let bestScore = -1;
  for (const t of types) {
    const s = scoreDeviceType(t);
    if (s > bestScore) {
      bestScore = s;
      best = t;
    }
  }
  return best || FALLBACK_DEVICE_TYPE;
}

module.exports = { getIosSimulatorDeviceType };
