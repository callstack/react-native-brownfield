const { device, element, by, waitFor, expect: detoxExpect } = require('detox');
const { brownfieldE2eTestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  configureDetoxForBrownfieldIos,
  waitForVisibleIgnoringSync,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

const detoxLaunchArgs = {
  BrownfieldPreferEmbeddedBundleInDebug: 'YES',
  DetoxE2E: 'YES',
};

async function scrollToEmbeddedRn() {
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

async function scrollToNativeShell() {
  try {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
  } catch {
    await element(by.label('Home')).swipe('down', 'fast', 0.85);
  }
}

async function waitForAppleAppReady() {
  // Expo home title uses non-breaking spaces; tab labels are stable readiness signals.
  const homeTab = by.label('Home');
  try {
    await waitForVisibleIgnoringSync(homeTab, 60000, 0);
  } catch {
    await device.disableSynchronization();
    try {
      await scrollToEmbeddedRn();
      await waitFor(element(homeTab).atIndex(0)).toBeVisible().withTimeout(30000);
    } finally {
      await device.enableSynchronization();
    }
  }
}

async function openPostMessageTab() {
  await waitForVisibleIgnoringSync(by.label('postMessage API'), 30000, 0);
  await element(by.label('postMessage API')).atIndex(0).tap();
  await waitForVisibleIgnoringSync(by.id(ids.sendMessageToNative), 30000);
}

describe('Brownfield (AppleApp — Expo)', () => {
  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
      launchArgs: detoxLaunchArgs,
    });
    await configureDetoxForBrownfieldIos();
    await waitForAppleAppReady();
  });

  it('shows the native greeting shell and embedded Expo home', async () => {
    await scrollToNativeShell();
    const greeting = element(by.id(ids.appleAppGreeting));
    await detoxExpect(greeting).toBeVisible();
    await assertDetoxTextMatches(greeting, /Hello native iOS Expo/);
    await detoxExpect(element(by.label('Home')).atIndex(0)).toBeVisible();
    await detoxExpect(element(by.text(/Welcome to\s+Expo\s+55/))).toBeVisible();
  });

  it('increments the native SwiftUI counter', async () => {
    await scrollToNativeShell();
    const counter = element(by.id(ids.appleAppNativeCounter));
    await detoxExpect(counter).toBeVisible();
    await assertDetoxTextMatches(counter, /You clicked the button 0 times/);
    await element(by.id(ids.appleAppNativeIncrement)).tap();
    await assertDetoxTextMatches(counter, /You clicked the button 1 time/);
  });

  it('shows a native toast when Expo RN sends postMessage', async () => {
    await openPostMessageTab();
    await element(by.id(ids.sendMessageToNative)).tap();
    await waitForVisibleIgnoringSync(by.id(ids.appleAppPostMessageToast), 5000);
  });

  it('records the RN postMessage bubble in the Expo surface', async () => {
    await openPostMessageTab();
    await element(by.id(ids.sendMessageToNative)).tap();
    const bubble = element(by.id(ids.rnPostMessageText)).atIndex(0);
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      try {
        await assertDetoxTextMatches(bubble, /Hello from Expo!/);
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    await assertDetoxTextMatches(bubble, /Hello from Expo!/);
  });
});
