'use strict';

const { execSync } = require('node:child_process');

/** Used when simctl is unavailable (e.g. CI without Xcode) or lists no iPhones. */
const FALLBACK_DEVICE_TYPE = 'iPhone 16';

function listSimctlIphoneDeviceTypes() {
  try {
    const out = execSync('xcrun simctl list devicetypes available', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const types = [];
    for (const line of out.split('\n')) {
      const m = line.match(/^\s*(iPhone [^(\n]+?)\s*\(/);
      if (m) types.push(m[1].trim());
    }
    return types;
  } catch {
    return [];
  }
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

  const types = listSimctlIphoneDeviceTypes();
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
