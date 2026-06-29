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
const ANDROID_BROWNFIELD_PACKAGE = 'com.callstack.brownfield.android.example';

function adbCommand() {
  const serial = process.env.ANDROID_SERIAL?.trim();
  return serial ? `adb -s ${serial}` : 'adb';
}

function adbShell(command) {
  try {
    execSync(`${adbCommand()} shell ${command}`, { stdio: 'ignore' });
  } catch {
    // Emulator may be offline or the command may be unsupported on older API levels.
  }
}

function adbExecOut(args) {
  return execSync(`${adbCommand()} ${args}`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
}

function isAndroidAppProcessRunning() {
  try {
    return adbExecOut(`shell pidof ${ANDROID_BROWNFIELD_PACKAGE}`).trim().length > 0;
  } catch {
    try {
      return adbExecOut(`shell pgrep -f ${ANDROID_BROWNFIELD_PACKAGE}`).trim().length > 0;
    } catch {
      return false;
    }
  }
}

async function waitForAndroidAppProcess(timeoutMs = 90000) {
  // Let Detox instrumentation finish starting the app before probing the process list.
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isAndroidAppProcessRunning()) {
      return;
    }
    await dismissAndroidSystemOverlays();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${ANDROID_BROWNFIELD_PACKAGE} process did not start`);
}

function dumpUiAutomatorHierarchy() {
  return adbExecOut('exec-out uiautomator dump /dev/fd/1');
}

async function pollUntilUiAutomatorContains(
  needle,
  timeoutMs = 20000,
  { keepCurrentActivity = false } = {}
) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const xml = dumpUiAutomatorHierarchy();
      if (xml.includes(needle)) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    if (keepCurrentActivity) {
      await dismissAndroidSystemOverlays();
    } else {
      await ensureAndroidAppWindowFocus();
    }
    await new Promise((resolve) =>
      setTimeout(resolve, DETOX_TIMING.POLL_INTERVAL_MS)
    );
  }

  try {
    const xml = dumpUiAutomatorHierarchy();
    if (xml.includes(needle)) {
      return;
    }
  } catch (error) {
    throw lastError || error;
  }

  throw new Error(`Timed out waiting for UIAutomator to contain: ${needle}`);
}

/** Scroll the native shell upward so the embedded RN fragment moves into view. */
async function scrollAndroidNativeShellUp() {
  adbShell('input swipe 540 1800 540 800 400');
  await dismissAndroidSystemOverlays();
}

/** Scroll the native shell downward so the greeting card moves back into view. */
async function scrollAndroidNativeShellDown() {
  adbShell('input swipe 540 800 540 1800 400');
  await dismissAndroidSystemOverlays();
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
  if (!isAndroidAppProcessRunning()) {
    return;
  }
  const launchExtras =
    '--es DetoxE2E YES --es BrownfieldPreferEmbeddedBundleInDebug YES';
  adbShell(
    `am start -W -n ${ANDROID_BROWNFIELD_MAIN_COMPONENT} --activity-single-top --activity-reorder-to-front ${launchExtras}`
  );
  adbShell('input tap 540 1200');
  await new Promise((resolve) => setTimeout(resolve, 500));
}

function detoxAttrFragments(attrs) {
  if (!attrs || typeof attrs !== 'object') {
    return [''];
  }
  const fragment = (o) => {
    if (o.text != null && String(o.text).length > 0) {
      return String(o.text);
    }
    if (o.label != null && String(o.label).length > 0) {
      return String(o.label);
    }
    if (o.value != null && String(o.value).length > 0) {
      return String(o.value);
    }
    if (o.hint != null && String(o.hint).length > 0) {
      return String(o.hint);
    }
    return '';
  };
  if ('elements' in attrs && Array.isArray(attrs.elements)) {
    return attrs.elements.map(fragment).map((text) => text.trim()).filter(Boolean);
  }
  return [fragment(attrs).trim()];
}

function detoxAttrsText(attrs) {
  const fragments = detoxAttrFragments(attrs);
  return fragments[0] || '';
}

async function assertDetoxTextMatches(nativeElement, pattern) {
  const attrs = await nativeElement.getAttributes();
  const fragments = detoxAttrFragments(attrs);
  const matched = fragments.some((text) => pattern.test(text));
  assert.ok(
    matched,
    `Expected ${pattern} in one of: ${fragments.join(' | ') || '(empty)'}`
  );
}

async function assertDetoxTextEventually(nativeElement, pattern, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await assertDetoxTextMatches(nativeElement, pattern);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, DETOX_TIMING.POLL_INTERVAL_MS));
    }
  }
  await assertDetoxTextMatches(nativeElement, pattern);
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
 * Poll for an element while Detox sync is off. On Android, use UIAutomator via adb
 * because Espresso getAttributes()/toBeVisible() block on window focus in headless CI.
 */
async function pollUntilElementAttributes(matcher, timeoutMs = 20000, index = 0) {
  if (device.getPlatform() === 'android') {
    const needle = androidUiAutomatorNeedleForMatcher(matcher);
    if (needle) {
      await pollUntilUiAutomatorContains(needle, timeoutMs);
      return { visible: true };
    }
  }

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
      await ensureAndroidAppWindowFocus();
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

function androidUiAutomatorNeedleForMatcher(matcher) {
  if (!matcher || typeof matcher !== 'object') {
    return null;
  }

  if (typeof matcher.value === 'string' && matcher.value.length > 0) {
    return matcher.value;
  }

  if (typeof matcher.test === 'function') {
    const source = String(matcher);
    const labelMatch = source.match(/label:\s*'([^']+)'/);
    if (labelMatch) {
      return labelMatch[1];
    }
    const idMatch = source.match(/id:\s*'([^']+)'/);
    if (idMatch) {
      return idMatch[1];
    }
    const textMatch = source.match(/text:\s*(\/.+?\/[a-z]*)/);
    if (textMatch) {
      const pattern = textMatch[1];
      const inner = pattern.match(/^\/(.+)\/([a-z]*)$/);
      if (inner) {
        return inner[1].replace(/\\(.)/g, '$1');
      }
    }
  }

  return null;
}

/**
 * Launch without waiting for RN Debug idle. On Android, leave Detox synchronization
 * disabled until the readiness helper finishes — re-enabling sync while RN is still
 * mounting causes long "The app seems to be idle" stalls and window-focus failures.
 *
 * Sync is disabled only via launchArgs — disableSynchronization() before launchApp()
 * fails because Detox is not connected to the app yet.
 */
async function launchBrownfieldAppForDetox({ newInstance = true, processTimeoutMs } = {}) {
  console.log('[e2e] Launching brownfield app via Detox...');
  await device.launchApp({
    newInstance,
    launchArgs: {
      ...detoxLaunchArgs,
      detoxEnableSynchronization: 0,
    },
  });

  if (device.getPlatform() === 'android') {
    await device.disableSynchronization();
    console.log('[e2e] Waiting for Android app process...');
    await waitForAndroidAppProcess(processTimeoutMs);
    await ensureAndroidAppWindowFocus();
    console.log('[e2e] Android app process is up');
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
  await ensureAndroidAppWindowFocus();
}

async function waitForVisible(matcher, timeoutMs = 20000, index = 0) {
  await waitFor(element(matcher).atIndex(index))
    .toBeVisible()
    .withTimeout(timeoutMs);
}

/**
 * Poll native-only / short-lived UI (toasts, popups, pushed native screens).
 * On Android, pass a test-id or text needle string, or a Detox matcher (best-effort).
 * Set keepCurrentActivity when waiting on a pushed native Activity (Settings, Referrals).
 */
async function waitForNativeOverlayVisible(
  matcherOrNeedle,
  timeoutMs = 20000,
  index = 0,
  { keepCurrentActivity = false } = {}
) {
  if (device.getPlatform() === 'android') {
    const needle =
      typeof matcherOrNeedle === 'string'
        ? matcherOrNeedle
        : androidUiAutomatorNeedleForMatcher(matcherOrNeedle);
    if (needle) {
      await pollUntilUiAutomatorContains(needle, timeoutMs, { keepCurrentActivity });
      if (!keepCurrentActivity) {
        await ensureAndroidAppWindowFocus();
      }
      return;
    }
  }

  await pollUntilElementAttributes(matcherOrNeedle, timeoutMs, index);
  if (device.getPlatform() === 'android' && !keepCurrentActivity) {
    await ensureAndroidAppWindowFocus();
  }
}

module.exports = {
  detoxLaunchArgs,
  detoxAttrsText,
  assertDetoxTextMatches,
  assertDetoxTextEventually,
  dismissAndroidSystemOverlays,
  ensureAndroidAppWindowFocus,
  waitForAndroidAppProcess,
  pollUntilUiAutomatorContains,
  scrollAndroidNativeShellUp,
  scrollAndroidNativeShellDown,
  configureDetoxForBrownfieldAndroid,
  configureDetoxForBrownfieldIos,
  launchBrownfieldAppForDetox,
  finishAndroidDetoxLaunch,
  pollUntilElementAttributes,
  waitForVisible,
  waitForNativeOverlayVisible,
};
