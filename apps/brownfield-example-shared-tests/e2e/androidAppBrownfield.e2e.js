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
  openReactNativeVanilla,
  waitForAndroidAppReadyVanilla,
} = require('@callstack/brownfield-example-shared-tests/e2e/androidAppDetoxUtils');

describe('Brownfield (AndroidApp — Vanilla)', () => {
  beforeEach(async () => {
    await launchBrownfieldAppForDetox({ newInstance: true });
    await waitForAndroidAppReadyVanilla();
  });

  it('navigates to native settings from the RN surface', async () => {
    await openReactNativeVanilla();
    await element(by.id(ids.openNativeSettings)).atIndex(0).tap();
    await waitForNativeOverlayVisible('Opened from BrownfieldNavigation.navigateToSettings', 10000, 0, {
      keepCurrentActivity: true,
    });
  });

  it('navigates to native referrals from the RN surface', async () => {
    await openReactNativeVanilla();
    await element(by.id(ids.openNativeReferrals)).atIndex(0).tap();
    await waitForNativeOverlayVisible('Opened from BrownfieldNavigation.navigateToReferrals', 10000, 0, {
      keepCurrentActivity: true,
    });
  });

  it('shows the native greeting shell and opens the RN home', async () => {
    await detoxExpect(element(by.id(ids.appleAppGreeting))).toBeVisible();
    await detoxExpect(element(by.id(ids.appleAppOpenReactNative))).toBeVisible();
    await openReactNativeVanilla();
    await detoxExpect(element(by.id(ids.rnAppHome))).toBeVisible();
    const title = element(by.id(ids.rnAppHomeTitle));
    await detoxExpect(title).toBeVisible();
    await assertDetoxTextMatches(title, /React Native Screen/);
  });

  it('increments the RN shared-store counter', async () => {
    await openReactNativeVanilla();
    const count = element(by.id(ids.counterCount)).atIndex(0);
    await detoxExpect(count).toBeVisible();
    await assertDetoxTextMatches(count, /Count:\s*0/);
    await element(by.id(ids.counterIncrement)).atIndex(0).tap();
    await pollUntilUiAutomatorContains('Count: 1', 15000, { keepCurrentActivity: true });
    await assertDetoxTextEventually(count, /Count:\s*1/);
  });
});
