const { device, element, by, waitFor } = require('detox');
const { brownfieldE2eTestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const { waitForVisibleIgnoringSync } = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

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
  const rnHome = element(by.id(ids.rnAppHome));
  try {
    await waitForVisibleIgnoringSync(by.id(ids.rnAppHome), 60000);
  } catch {
    await device.disableSynchronization();
    try {
      await scrollToEmbeddedRnVanilla();
      await waitFor(rnHome).toBeVisible().withTimeout(30000);
    } finally {
      await device.enableSynchronization();
    }
  }
}

async function waitForAppleAppReadyExpo() {
  const homeTab = by.label('Home');
  try {
    await waitForVisibleIgnoringSync(homeTab, 60000, 0);
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
  await waitForVisibleIgnoringSync(by.label('postMessage API'), 30000, 0);
  await element(by.label('postMessage API')).atIndex(0).tap();
  await waitForVisibleIgnoringSync(by.id(ids.sendMessageToNative), 30000);
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
};
