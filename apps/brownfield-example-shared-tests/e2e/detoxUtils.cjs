const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const { device, element, waitFor, expect: detoxExpect } = require('detox');
const { DETOX_TIMING } = require('./detoxTiming.cjs');

const detoxLaunchArgs = {
  BrownfieldPreferEmbeddedBundleInDebug: 'YES',
  DetoxE2E: 'YES',
};

const ANDROID_BROWNFIELD_MAIN_COMPONENT =
  'com.callstack.brownfield.android.example/com.callstack.brownfield.android.example.MainActivity';

function adbShell(command) {
  const serial = process.env.ANDROID_SERIAL?.trim();
  const adb = serial ? `adb -s ${serial}` : 'adb';
  try {
    execSync(`${adb} shell ${command}`, { stdio: 'ignore' });
  } catch {
    // Emulator may be offline or the command may be unsupported on older API levels.
  }
}

/**
 * Collapse the notification shade via adb.
 * Safe after launchApp and after scroll gestures — never press Back here (that can
 * finish MainActivity and Espresso reports "No activities found").
 */
async function dismissAndroidSystemOverlays() {
  if (device.getPlatform() !== 'android') {
    return;
  }
  // Headless CI emulators can leave the keyguard, shade, or heads-up UI without window focus.
  adbShell('input keyevent KEYCODE_WAKEUP');
  adbShell('wm dismiss-keyguard');
  adbShell('cmd statusbar collapse');
  adbShell('settings put global heads_up_notifications_enabled 0');
}

/** Bring MainActivity to the foreground so Espresso can obtain window focus. */
async function ensureAndroidAppWindowFocus() {
  if (device.getPlatform() !== 'android') {
    return;
  }
  await dismissAndroidSystemOverlays();
  adbShell(`am start -W -n ${ANDROID_BROWNFIELD_MAIN_COMPONENT}`);
  await new Promise((resolve) => setTimeout(resolve, 300));
}

function detoxAttrsText(attrs) {
  if (!attrs || typeof attrs !== 'object') {
    return '';
  }
  const fragment = (o) =>
    [o.text, o.value, o.label, o.hint]
      .filter((x) => x != null && String(x).length > 0)
      .join('');
  if ('elements' in attrs && Array.isArray(attrs.elements)) {
    return attrs.elements.map(fragment).join('').trim();
  }
  return fragment(attrs).trim();
}

async function assertDetoxTextMatches(nativeElement, pattern) {
  const attrs = await nativeElement.getAttributes();
  assert.match(detoxAttrsText(attrs).trim(), pattern);
}

/** Ignore Metro / packager polling so Detox does not wait forever in Debug without a dev server. */
async function configureDetoxForBrownfieldIos() {
  await device.setURLBlacklist([
    'http://localhost:8081.*',
    'http://127.0.0.1:8081.*',
    'http://.*:8081.*',
  ]);
}

/** AndroidApp release E2E uses the embedded AAR bundle (no Metro). */
async function configureDetoxForBrownfieldAndroid() {
  // No URL blacklist needed on Android.
}

/**
 * Poll via UiAutomator getAttributes() — avoids Espresso's window-focus gate used by
 * toBeVisible(), which headless CI emulators often fail for 10s per attempt.
 */
async function pollUntilElementAttributes(matcher, timeoutMs = 20000, index = 0) {
  const deadline = Date.now() + timeoutMs;
  const target = element(matcher).atIndex(index);
  let lastError;

  while (Date.now() < deadline) {
    try {
      const attrs = await target.getAttributes();
      if (attrs) {
        return attrs;
      }
    } catch (error) {
      lastError = error;
    }

    if (device.getPlatform() === 'android') {
      await dismissAndroidSystemOverlays();
    }

    await new Promise((resolve) =>
      setTimeout(resolve, DETOX_TIMING.POLL_INTERVAL_MS)
    );
  }

  try {
    return await target.getAttributes();
  } catch (error) {
    throw lastError || error;
  }
}

/**
 * Launch without waiting for RN Debug idle. On Android, leave Detox synchronization
 * disabled until the readiness helper finishes — re-enabling sync while RN is still
 * mounting causes long "The app seems to be idle" stalls and window-focus failures.
 *
 * Sync is disabled only via launchArgs — disableSynchronization() before launchApp()
 * fails because Detox is not connected to the app yet.
 */
async function launchBrownfieldAppForDetox({ newInstance = true } = {}) {
  await device.launchApp({
    newInstance,
    launchArgs: {
      ...detoxLaunchArgs,
      detoxEnableSynchronization: 0,
    },
  });

  if (device.getPlatform() === 'android') {
    await ensureAndroidAppWindowFocus();
    return;
  }

  await configureDetoxForBrownfieldIos();
  await device.enableSynchronization();
}

/** Call after Android readiness polling so Espresso matchers can interact with the app. */
async function finishAndroidDetoxLaunch() {
  if (device.getPlatform() !== 'android') {
    return;
  }
  await ensureAndroidAppWindowFocus();
  await device.enableSynchronization();
}

async function waitForVisible(matcher, timeoutMs = 20000, index = 0) {
  await waitFor(element(matcher).atIndex(index))
    .toBeVisible()
    .withTimeout(timeoutMs);
}

/**
 * Poll native-only / short-lived UI (toasts, popups, pushed native screens).
 * Uses getAttributes() instead of toBeVisible() so CI emulators without window focus
 * can still detect Compose / native overlays during startup.
 */
async function waitForNativeOverlayVisible(matcher, timeoutMs = 20000, index = 0) {
  await pollUntilElementAttributes(matcher, timeoutMs, index);
  if (device.getPlatform() === 'android') {
    await ensureAndroidAppWindowFocus();
  }
}

module.exports = {
  detoxLaunchArgs,
  detoxAttrsText,
  assertDetoxTextMatches,
  dismissAndroidSystemOverlays,
  ensureAndroidAppWindowFocus,
  configureDetoxForBrownfieldAndroid,
  configureDetoxForBrownfieldIos,
  launchBrownfieldAppForDetox,
  finishAndroidDetoxLaunch,
  pollUntilElementAttributes,
  waitForVisible,
  waitForNativeOverlayVisible,
};
