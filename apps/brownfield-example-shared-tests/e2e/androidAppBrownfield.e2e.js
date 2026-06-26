const { element, by, expect: detoxExpect } = require('detox');
const { brownfieldE2ETestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextEventually,
  assertDetoxTextMatches,
  launchBrownfieldAppForDetox,
  pollUntilUiAutomatorContains,
  waitForNativeOverlayVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');
const {
  scrollToNativeShellVanilla,
  waitForAndroidAppReadyVanilla,
} = require('@callstack/brownfield-example-shared-tests/e2e/androidAppDetoxUtils');

/** RN <Button> testIDs are unreliable on Android Fabric — tap visible button labels. */
const INCREMENT_BUTTON = by.text('Increment');
const OPEN_SETTINGS_BUTTON = by.text('Open native settings');
const OPEN_REFERRALS_BUTTON = by.text('Open native referrals');

describe('Brownfield (AndroidApp — Vanilla)', () => {
  beforeEach(async () => {
    await launchBrownfieldAppForDetox({ newInstance: true });
    await waitForAndroidAppReadyVanilla();
  });

  it('shows the native greeting shell and embedded RN home', async () => {
    await scrollToNativeShellVanilla();
    await detoxExpect(element(by.id(ids.appleAppGreeting))).toBeVisible();
    await detoxExpect(element(by.id(ids.rnAppHome))).toBeVisible();
    const title = element(by.id(ids.rnAppHomeTitle));
    await detoxExpect(title).toBeVisible();
    await assertDetoxTextMatches(title, /React Native Screen/);
  });

  it('increments the embedded RN shared-store counter', async () => {
    const count = element(by.id(ids.counterCount)).atIndex(0);
    await detoxExpect(count).toBeVisible();
    await assertDetoxTextMatches(count, /Count:\s*0/);
    await element(INCREMENT_BUTTON).atIndex(0).tap();
    await pollUntilUiAutomatorContains('Count: 1', 15000);
    await assertDetoxTextEventually(count, /Count:\s*1/);
  });

  it('navigates to native settings from the RN surface', async () => {
    await element(OPEN_SETTINGS_BUTTON).atIndex(0).tap();
    await waitForNativeOverlayVisible('Opened from BrownfieldNavigation.navigateToSettings', 10000, 0, {
      keepCurrentActivity: true,
    });
  });

  it('navigates to native referrals from the RN surface', async () => {
    await element(OPEN_REFERRALS_BUTTON).atIndex(0).tap();
    await waitForNativeOverlayVisible('Opened from BrownfieldNavigation.navigateToReferrals', 10000, 0, {
      keepCurrentActivity: true,
    });
  });
});
