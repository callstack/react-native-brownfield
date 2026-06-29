const { element, by, expect: detoxExpect } = require('detox');
const { brownfieldE2ETestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  launchBrownfieldAppForDetox,
  pollUntilUiAutomatorContains,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');
const {
  scrollToEmbeddedRnExpo,
  scrollToNativeShellExpo,
  waitForAndroidAppReadyExpo,
  openPostMessageTabExpo,
  EXPO55_RN_SURFACE_NEEDLE,
} = require('@callstack/brownfield-example-shared-tests/e2e/androidAppDetoxUtils');

describe('Brownfield (AndroidApp — Expo)', () => {
  beforeEach(async () => {
    await launchBrownfieldAppForDetox({ newInstance: true });
    await waitForAndroidAppReadyExpo();
  });

  it('shows the native greeting shell and embedded Expo home', async () => {
    await scrollToNativeShellExpo();
    const greeting = element(by.id(ids.appleAppGreeting));
    await detoxExpect(greeting).toBeVisible();
    await pollUntilUiAutomatorContains('Hello native Android (Expo 55)', 10000, {
      keepCurrentActivity: true,
    });
    await scrollToEmbeddedRnExpo();
    await pollUntilUiAutomatorContains(EXPO55_RN_SURFACE_NEEDLE, 30000, {
      keepCurrentActivity: true,
    });
  });

  it('records the RN postMessage bubble in the Expo surface', async () => {
    await openPostMessageTabExpo();
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
