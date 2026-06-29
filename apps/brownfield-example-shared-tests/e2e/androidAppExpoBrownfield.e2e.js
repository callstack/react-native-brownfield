const {
  dismissAndroidSystemOverlays,
  launchBrownfieldAppForDetox,
  pollUntilUiAutomatorContains,
  pollUntilUiAutomatorContainsAny,
  tapUiAutomatorTarget,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');
const {
  scrollToEmbeddedRnExpo,
  scrollToNativeShellExpo,
  waitForAndroidAppReadyExpo,
  openPostMessageTabExpo,
  EXPO55_GREETING_NEEDLE,
  EXPO55_RN_SURFACE_NEEDLES,
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
    await scrollToNativeShellExpo();
    await pollUntilUiAutomatorContains(EXPO55_GREETING_NEEDLE, 15000, {
      keepCurrentActivity: true,
    });
    await scrollToEmbeddedRnExpo();
    await pollUntilUiAutomatorContainsAny(EXPO55_RN_SURFACE_NEEDLES, 30000, {
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
