const { device, element, by, waitFor, expect: detoxExpect } = require('detox');
const {
  brownfieldE2ETestIds: ids,
} = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const { DETOX_TIMING } = require('./detoxTiming.cjs');
const {
  detoxLaunchArgs,
  waitForVisible,
  waitForNativeOverlayVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

const EXPO_HOME_TAB_MATCHERS = [by.id(ids.expoHomeTab), by.label('Home')];
const EXPO_POST_MESSAGE_TAB_MATCHERS = [
  by.id(ids.expoPostMessageTab),
  by.label('postMessage API'),
];
const EXPO_WELCOME_TITLE = by.text(/Welcome to\s+Expo\s+\d+/);

async function isVisible(matcher, index = 0) {
  try {
    await detoxExpect(element(matcher).atIndex(index)).toBeVisible();
    return true;
  } catch {
    return false;
  }
}

async function withExpoTabMatcher(matchers, action) {
  let lastError;
  for (const matcher of matchers) {
    try {
      return await action(matcher);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function waitForAnyVisible(matchers, timeoutMs, index = 0) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const matcher of matchers) {
      if (await isVisible(matcher, index)) {
        return matcher;
      }
    }
    await new Promise((resolve) =>
      setTimeout(resolve, DETOX_TIMING.POLL_INTERVAL_MS)
    );
  }

  let lastError;
  for (const matcher of matchers) {
    try {
      await detoxExpect(element(matcher).atIndex(index)).toBeVisible();
      return matcher;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function tapExpoTab(matchers) {
  try {
    await withExpoTabMatcher(matchers, async (matcher) => {
      await waitForVisible(matcher, DETOX_TIMING.VISIBILITY_TIMEOUT_MS, 0);
      await element(matcher).atIndex(0).tap();
    });
    return;
  } catch {
    // AppleApp can clip the native tab bar inside the embedded Expo surface.
    // Fall back to a direct native tap when the tab exists but does not meet
    // Detox visibility heuristics.
  }

  await device.disableSynchronization();
  try {
    await withExpoTabMatcher(matchers, (matcher) =>
      element(matcher).atIndex(0).tap()
    );
  } finally {
    await device.enableSynchronization();
  }
}

async function scrollToEmbeddedRnVanilla() {
  try {
    await element(by.type('UIScrollView')).atIndex(0).scroll(500, 'down');
  } catch {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
  }
}

async function scrollToEmbeddedRnExpo() {
  if (
    (await isVisible(EXPO_HOME_TAB_MATCHERS[0])) ||
    (await isVisible(EXPO_HOME_TAB_MATCHERS[1])) ||
    (await isVisible(EXPO_WELCOME_TITLE))
  ) {
    return;
  }

  const scrollView = element(by.type('UIScrollView')).atIndex(0);
  try {
    await scrollView.scroll(500, 'down');
  } catch {
    try {
      await scrollView.scrollTo('bottom');
    } catch {
      try {
        await scrollView.swipe('up', 'fast', 0.85);
      } catch {
        await withExpoTabMatcher(EXPO_HOME_TAB_MATCHERS, (matcher) =>
          element(matcher).atIndex(0).swipe('up', 'fast', 0.85)
        );
      }
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
    await withExpoTabMatcher(EXPO_HOME_TAB_MATCHERS, (matcher) =>
      element(matcher).atIndex(0).swipe('down', 'fast', 0.85)
    );
  }
}

async function waitForEmbeddedExpoMatcher(matcher, index = 0) {
  try {
    await waitForVisible(matcher, 5_000, index);
    return;
  } catch {
    // The embedded Expo surface may already be mounted but off-screen.
  }

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
  await device.disableSynchronization();

  try {
    try {
      await waitForAnyVisible(
        [
          EXPO_HOME_TAB_MATCHERS[0],
          EXPO_HOME_TAB_MATCHERS[1],
          EXPO_WELCOME_TITLE,
        ],
        60_000
      );
      return;
    } catch {
      // Continue with scroll-based recovery when the embedded surface starts
      // outside the initial viewport.
    }

    try {
      await waitForEmbeddedExpoMatcher(EXPO_HOME_TAB_MATCHERS[0], 0);
      return;
    } catch {
      // Expo 55 does not expose tab IDs; fall back to the visible tab label.
    }

    try {
      await waitForEmbeddedExpoMatcher(EXPO_HOME_TAB_MATCHERS[1], 0);
      return;
    } catch {
      // Some Expo builds render the screen title before the tab labels settle.
    }

    await waitForEmbeddedExpoMatcher(EXPO_WELCOME_TITLE, 0);
  } finally {
    await device.enableSynchronization();
  }
}

async function openHomeTabExpo() {
  await waitForAppleAppReadyExpo();
  await tapExpoTab(EXPO_HOME_TAB_MATCHERS);
  await waitForEmbeddedExpoMatcher(EXPO_WELCOME_TITLE);
}

async function openPostMessageTabExpo() {
  await waitForAppleAppReadyExpo();
  await tapExpoTab(EXPO_POST_MESSAGE_TAB_MATCHERS);
  await waitForVisible(
    by.id(ids.sendMessageToNative),
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS
  );
}

async function sendPostMessageToNativeAndWaitForToast() {
  await waitForVisible(
    by.id(ids.sendMessageToNative),
    DETOX_TIMING.VISIBILITY_TIMEOUT_MS
  );
  // Tap with sync off — embedded Expo can keep Detox busy while native UI is ready.
  await device.disableSynchronization();
  try {
    await element(by.id(ids.sendMessageToNative)).tap();
  } finally {
    await device.enableSynchronization();
  }
  // Assert toast before RN bubble: E2E toast is visible for ~10s and can dismiss
  // while Fabric/accessibility catches up on the message list.
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
  waitForEmbeddedExpoMatcher,
  waitForAppleAppReadyVanilla,
  waitForAppleAppReadyExpo,
  openHomeTabExpo,
  openPostMessageTabExpo,
  sendPostMessageToNativeAndWaitForToast,
};
