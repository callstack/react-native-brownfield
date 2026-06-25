const { device, element, by, waitFor } = require('detox');
const { brownfieldE2ETestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  dismissAndroidSystemOverlays,
  waitForVisible,
  waitForNativeOverlayVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

/** Middle-of-screen anchor — avoids status-bar swipes that open the notification shade. */
const NATIVE_SHELL_SCROLL_ANCHOR = ids.appleAppGreeting;

async function scrollNativeShell(fingerDirection) {
  const anchor = element(by.id(NATIVE_SHELL_SCROLL_ANCHOR));
  await waitFor(anchor).toBeVisible().withTimeout(10000);
  try {
    await anchor.swipe(fingerDirection, 'slow', 0.75);
  } catch {
    await element(by.type('android.widget.ScrollView')).atIndex(0).scroll(
      400,
      fingerDirection === 'up' ? 'down' : 'up'
    );
  }
  await dismissAndroidSystemOverlays();
}

async function scrollToEmbeddedRnVanilla() {
  await scrollNativeShell('up');
}

async function scrollToEmbeddedRnExpo() {
  try {
    await element(by.label('Home')).atIndex(0).swipe('up', 'fast', 0.85);
  } catch {
    await scrollToEmbeddedRnVanilla();
  }
  await dismissAndroidSystemOverlays();
}

async function scrollToNativeShellVanilla() {
  await scrollNativeShell('down');
}

async function scrollToNativeShellExpo() {
  try {
    await element(by.label('Home')).atIndex(0).swipe('down', 'fast', 0.85);
  } catch {
    await scrollToNativeShellVanilla();
  }
  await dismissAndroidSystemOverlays();
}

async function waitForAndroidAppReadyVanilla() {
  await waitFor(element(by.id(ids.appleAppGreeting))).toBeVisible().withTimeout(60000);

  await scrollToEmbeddedRnVanilla();

  const rnHome = element(by.id(ids.rnAppHome));
  try {
    await waitFor(rnHome).toBeVisible().withTimeout(60000);
  } catch {
    await scrollToEmbeddedRnVanilla();
    await waitFor(rnHome).toBeVisible().withTimeout(30000);
  }
}

async function waitForAndroidAppReadyExpo() {
  const homeTab = by.label('Home');
  try {
    await waitForVisible(homeTab, 120000, 0);
  } catch {
    await device.disableSynchronization();
    try {
      await scrollToEmbeddedRnExpo();
      await waitFor(element(homeTab).atIndex(0)).toBeVisible().withTimeout(30000);
    } finally {
      await device.enableSynchronization();
    }
  }
}

async function openPostMessageTabExpo() {
  await waitForVisible(by.label('postMessage API'), 30000, 0);
  await element(by.label('postMessage API')).atIndex(0).tap();
  await waitForVisible(by.id(ids.sendMessageToNative), 30000);
}

async function sendPostMessageToNativeAndWaitForToast(rnMessagePattern) {
  await waitForVisible(by.id(ids.sendMessageToNative), 30000);
  await element(by.id(ids.sendMessageToNative)).tap();
  if (rnMessagePattern) {
    const bubble = element(by.id(ids.rnPostMessageText)).atIndex(0);
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      try {
        await assertDetoxTextMatches(bubble, rnMessagePattern);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    await assertDetoxTextMatches(bubble, rnMessagePattern);
  }
  await waitForNativeOverlayVisible(by.id(ids.appleAppPostMessageToast), 10000);
}

module.exports = {
  scrollToEmbeddedRnVanilla,
  scrollToEmbeddedRnExpo,
  scrollToNativeShellVanilla,
  scrollToNativeShellExpo,
  waitForAndroidAppReadyVanilla,
  waitForAndroidAppReadyExpo,
  openPostMessageTabExpo,
  sendPostMessageToNativeAndWaitForToast,
};
