const { device, element, by, waitFor } = require('detox');
const {
  brownfieldE2ETestIds: ids,
} = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const { DETOX_TIMING } = require('./detoxTiming.cjs');
const {
  assertDetoxTextMatches,
  detoxLaunchArgs,
  waitForVisible,
  waitForNativeOverlayVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

const EXPO_HOME_TAB = by.label('Home');
const EXPO_WELCOME_TITLE = by.text(/Welcome to\s+Expo\s+\d+/);

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
      await element(EXPO_HOME_TAB).atIndex(0).swipe('up', 'fast', 0.85);
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
    await element(EXPO_HOME_TAB).atIndex(0).swipe('down', 'fast', 0.85);
  }
}

async function waitForEmbeddedExpoMatcher(matcher, index = 0) {
  try {
    await scrollToEmbeddedRnExpo();
  } catch {
    // Embedded RN may already be on screen.
  }

  try {
    await waitForVisible(matcher, DETOX_TIMING.VISIBILITY_TIMEOUT_MS, index);
    return;
  } catch {
    // AppleApp is a SwiftUI host, not an RCTAppDelegate-based shell, so Detox
    // cannot safely call reloadReactNative() here. Fall back to manual scroll
    // recovery while synchronization is disabled.
  }

  await device.disableSynchronization();
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await scrollToEmbeddedRnExpo();
      } catch {
        // Continue polling visibility.
      }

      try {
        await waitFor(element(matcher).atIndex(index))
          .toBeVisible()
          .withTimeout(10_000);
        return;
      } catch {
        // Continue retry loop.
      }
    }

    await waitFor(element(matcher).atIndex(index))
      .toBeVisible()
      .withTimeout(10_000);
  } finally {
    await device.enableSynchronization();
  }
}

async function waitForAppleAppReadyVanilla() {
  const rnHomeMatcher = by.id(ids.rnAppHome);
  try {
    await scrollToEmbeddedRnVanilla();
  } catch {
    // Continue polling visibility.
  }

  try {
    await waitForVisible(rnHomeMatcher, DETOX_TIMING.VISIBILITY_TIMEOUT_MS);
    return;
  } catch {
    // AppleApp is a SwiftUI host, not an RCTAppDelegate-based shell, so Detox
    // cannot safely call reloadReactNative() here. Fall back to scroll-based
    // recovery when the embedded surface is mounted off-screen.
  }

  await device.disableSynchronization();
  try {
    await scrollToEmbeddedRnVanilla();
    await waitFor(element(rnHomeMatcher)).toBeVisible().withTimeout(20_000);
  } finally {
    await device.enableSynchronization();
  }
}

async function waitForAppleAppReadyExpo() {
  try {
    await waitForEmbeddedExpoMatcher(EXPO_HOME_TAB, 0);
    return;
  } catch {
    // Home tab can be off-screen or slow; welcome title is a reliable fallback.
  }

  await waitForEmbeddedExpoMatcher(EXPO_WELCOME_TITLE);
}

async function openPostMessageTabExpo() {
  await scrollToEmbeddedRnExpo();
  await waitForVisible(
    by.label('postMessage API'),
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS,
    0
  );
  await element(by.label('postMessage API')).atIndex(0).tap();
  await waitForVisible(
    by.id(ids.sendMessageToNative),
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS
  );
}

async function sendPostMessageToNativeAndWaitForToast(rnMessagePattern) {
  await waitForVisible(
    by.id(ids.sendMessageToNative),
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS
  );
  await element(by.id(ids.sendMessageToNative)).tap();
  const bubble = element(by.id(ids.rnPostMessageText)).atIndex(0);
  const deadline = Date.now() + DETOX_TIMING.POST_MESSAGE_BUBBLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await assertDetoxTextMatches(bubble, rnMessagePattern);
      break;
    } catch {
      await new Promise((resolve) =>
        setTimeout(resolve, DETOX_TIMING.POLL_INTERVAL_MS)
      );
    }
  }
  await assertDetoxTextMatches(bubble, rnMessagePattern);
  await waitForNativeOverlayVisible(
    by.id(ids.appleAppPostMessageToast),
    DETOX_TIMING.TOAST_VISIBILITY_TIMEOUT_MS
  );
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
