const {
  dismissAndroidSystemOverlays,
  launchBrownfieldAppForDetox,
  pollUntilUiAutomatorContains,
  tapUiAutomatorTarget,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');
const {
  brownfieldE2ETestIds: ids,
} = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  scrollToEmbeddedRnExpo,
  scrollToNativeShellExpo,
  waitForAndroidAppReadyExpo,
  openPostMessageTabExpo,
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
    await scrollToNativeShellExpo();
    await pollUntilUiAutomatorContains(EXPO56_GREETING_NEEDLE, 15000, {
      keepCurrentActivity: true,
    });
    await scrollToEmbeddedRnExpo();
    await pollUntilUiAutomatorContains(ids.rnAppHome, 30000, {
      keepCurrentActivity: true,
    });
  });

  it('records the RN postMessage bubble in the Expo surface', async () => {
    await openPostMessageTabExpo();
    try {
      await tapUiAutomatorTarget({ resourceId: ids.sendMessageToNative }, 15000, {
        keepCurrentActivity: true,
      });
    } catch {
      await tapUiAutomatorTarget({ needle: 'Send message to Native' }, 30000, {
        keepCurrentActivity: true,
      });
    }
    await pollUntilUiAutomatorContains('Hello from Expo!', 15000, {
      keepCurrentActivity: true,
    });
  });
});
