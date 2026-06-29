const { element, by, expect: detoxExpect } = require('detox');
const { brownfieldE2ETestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  dismissAndroidSystemOverlays,
  ensureAndroidAppWindowFocus,
  launchBrownfieldAppForDetox,
  pollUntilUiAutomatorContains,
  tapUiAutomatorTarget,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');
const {
  scrollToEmbeddedRnExpo,
  scrollToNativeShellExpo,
  waitForAndroidAppReadyExpo,
  openPostMessageTabExpo,
  EXPO55_GREETING_NEEDLE,
  EXPO55_RN_SURFACE_NEEDLE,
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
    await ensureAndroidAppWindowFocus();
  });

  it('shows the native greeting shell and embedded Expo home', async () => {
    await scrollToNativeShellExpo();
    const greeting = element(by.id(ids.appleAppGreeting));
    await detoxExpect(greeting).toBeVisible();
    await pollUntilUiAutomatorContains(EXPO55_GREETING_NEEDLE, 10000, {
      keepCurrentActivity: true,
    });
    await scrollToEmbeddedRnExpo();
    await pollUntilUiAutomatorContains(EXPO55_RN_SURFACE_NEEDLE, 30000, {
      keepCurrentActivity: true,
    });
  });

  it('records the RN postMessage bubble in the Expo surface', async () => {
    await openPostMessageTabExpo();
    await tapUiAutomatorTarget({ needle: 'Send message to Native' }, 30000, {
      keepCurrentActivity: true,
    });
    await pollUntilUiAutomatorContains('Hello from Expo!', 15000, {
      keepCurrentActivity: true,
    });
  });
});
