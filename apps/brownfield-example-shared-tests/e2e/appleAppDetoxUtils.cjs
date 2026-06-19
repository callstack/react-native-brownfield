const { device, element, by, waitFor } = require('detox');
const { brownfieldE2eTestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  waitForVisibleIgnoringSync,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

const detoxLaunchArgs = {
  BrownfieldPreferEmbeddedBundleInDebug: 'YES',
  DetoxE2E: 'YES',
};

async function scrollToEmbeddedRnVanilla() {
  try {
    await element(by.type('UIScrollView')).atIndex(0).scroll(500, 'down');
  } catch {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
  }
}

async function scrollToEmbeddedRnExpo() {
  const scrollView = element(by.type('UIScrollView')).atIndex(0);
  try {
    await scrollView.scroll(500, 'down');
  } catch {
    try {
      await scrollView.scrollTo('bottom');
    } catch {
      await element(by.label('Home')).swipe('up', 'fast', 0.85);
    }
  }
}

async function scrollToNativeShellVanilla() {
  try {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
  } catch {
    await element(by.id(ids.rnAppHome)).swipe('down', 'fast', 0.85);
  }
}

async function scrollToNativeShellExpo() {
  try {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
  } catch {
    await element(by.label('Home')).swipe('down', 'fast', 0.85);
  }
}

async function waitForAppleAppReadyVanilla() {
  const rnHomeMatcher = by.id(ids.rnAppHome);
  const rnHome = element(rnHomeMatcher);
  try {
    await waitForVisibleIgnoringSync(rnHomeMatcher, 30000);
  } catch {
    // AppleApp is a SwiftUI host, not an RCTAppDelegate-based shell, so Detox
    // cannot safely call reloadReactNative() here. Fall back to scroll-based
    // recovery when the embedded surface is mounted off-screen.
    await device.disableSynchronization();
    try {
      await scrollToEmbeddedRnVanilla();
      await waitFor(rnHome).toBeVisible().withTimeout(20000);
    } finally {
      await device.enableSynchronization();
    }
  }
}

async function waitForAppleAppReadyExpo() {
  const homeTab = by.label('Home');
  const homeElement = () => element(homeTab).atIndex(0);
  const welcomeTitle = by.text(/Welcome to\s+Expo\s+\d+/);
  try {
    await waitForVisibleIgnoringSync(homeTab, 30000, 0);
    return;
  } catch {
    // AppleApp is a SwiftUI host, not an RCTAppDelegate-based shell, so Detox
    // cannot safely call reloadReactNative() here. Fall back to scroll-based
    // recovery when the embedded surface is mounted off-screen.
  }

  await device.disableSynchronization();
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await scrollToEmbeddedRnExpo();
      } catch {}

      try {
        await waitFor(homeElement()).toBeVisible().withTimeout(10000);
        return;
      } catch {}

      try {
        await waitFor(element(welcomeTitle)).toBeVisible().withTimeout(10000);
        return;
      } catch {}
    }

    await waitFor(homeElement()).toBeVisible().withTimeout(10000);
  } finally {
    await device.enableSynchronization();
  }
}

async function openPostMessageTabExpo() {
  await waitForVisibleIgnoringSync(by.label('postMessage API'), 30000, 0);
  await element(by.label('postMessage API')).atIndex(0).tap();
  await waitForVisibleIgnoringSync(by.id(ids.sendMessageToNative), 30000);
}

async function sendPostMessageToNativeAndWaitForToast(rnMessagePattern) {
  await waitForVisibleIgnoringSync(by.id(ids.sendMessageToNative), 30000);
  await element(by.id(ids.sendMessageToNative)).tap();
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
  await waitForVisibleIgnoringSync(by.id(ids.appleAppPostMessageToast), 10000);
}

module.exports = {
  detoxLaunchArgs,
  scrollToEmbeddedRnVanilla,
  scrollToEmbeddedRnExpo,
  scrollToNativeShellVanilla,
  scrollToNativeShellExpo,
  waitForAppleAppReadyVanilla,
  waitForAppleAppReadyExpo,
  openPostMessageTabExpo,
  sendPostMessageToNativeAndWaitForToast,
};
