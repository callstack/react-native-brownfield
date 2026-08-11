const { element, by, expect: detoxExpect, waitFor } = require('detox');
const {
  brownfieldE2ETestIds: ids,
} = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  dismissAndroidSystemOverlays,
  launchBrownfieldAppForDetox,
  pollUntilUiAutomatorContains,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');
const {
  scrollToEmbeddedRnExpo,
  scrollToNativeShellExpo,
  waitForAndroidAppReadyExpo,
  openPostMessageTabExpo,
  tapSendMessageToNativeExpo,
  EXPO56_GREETING_NEEDLE,
} = require('@callstack/brownfield-example-shared-tests/e2e/androidAppDetoxUtils');

describe('Brownfield (AndroidApp — Expo)', () => {
  beforeAll(async () => {
    console.log('[e2e] Expo beforeAll: launch + readiness');
    await launchBrownfieldAppForDetox({ newInstance: true, processTimeoutMs: 120000 });
    await waitForAndroidAppReadyExpo();
    console.log('[e2e] Expo beforeAll: ready');
  });

  beforeEach(async () => {
    await dismissAndroidSystemOverlays();
  });

  it('shows the native greeting shell and embedded Expo home', async () => {
    await scrollToEmbeddedRnExpo();
    await detoxExpect(element(by.id(ids.rnAppHome))).toBeVisible();

    await scrollToNativeShellExpo();
    await detoxExpect(element(by.id(ids.appleAppGreeting))).toBeVisible();
    await pollUntilUiAutomatorContains(EXPO56_GREETING_NEEDLE, 15000, {
      keepCurrentActivity: true,
    });

    await scrollToEmbeddedRnExpo();
    await detoxExpect(element(by.id(ids.rnAppHome))).toBeVisible();
  });

  it('records the RN postMessage bubble in the Expo surface', async () => {
    await openPostMessageTabExpo();
    await tapSendMessageToNativeExpo();

    const bubble = element(by.id(ids.rnPostMessageText)).atIndex(0);
    await waitFor(bubble).toBeVisible().withTimeout(15000);
    await assertDetoxTextMatches(bubble, /Hello from Expo!/);
  });
});
