const { element, by, expect: detoxExpect } = require('detox');
const {
  brownfieldE2ETestIds: ids,
} = require('@callstack/shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  launchBrownfieldAppForDetox,
  waitForNativeOverlayVisible,
} = require('@callstack/shared-tests/e2e/detoxUtils');
const {
  openReactNativeVanilla,
  waitForAppleAppReady,
  sendPostMessageToNativeAndWaitForToast,
} = require('@callstack/shared-tests/e2e/appleAppDetoxUtils');

describe('Brownfield (AppleApp — Vanilla)', () => {
  beforeEach(async () => {
    await launchBrownfieldAppForDetox({ newInstance: true, enableSync: false });
    await waitForAppleAppReady();
  });

  it('shows the native greeting shell and opens the RN home', async () => {
    await detoxExpect(element(by.id(ids.appleAppGreeting))).toBeVisible();
    await openReactNativeVanilla();
    await detoxExpect(element(by.id(ids.rnAppHome))).toBeVisible();
    const title = element(by.id(ids.rnAppHomeTitle));
    await detoxExpect(title).toBeVisible();
    await assertDetoxTextMatches(title, /React Native Screen/);
  });

  it('increments the RN shared-store counter', async () => {
    await openReactNativeVanilla();
    const count = element(by.id(ids.counterCount));
    await detoxExpect(count).toBeVisible();
    await assertDetoxTextMatches(count, /Count:\s*0/);
    await element(by.id(ids.counterIncrement)).tap();
    await assertDetoxTextMatches(count, /Count:\s*1/);
  });

  it('shows a native toast when RN sends postMessage', async () => {
    await openReactNativeVanilla();
    await sendPostMessageToNativeAndWaitForToast();
  });

  it('navigates to native settings from the RN surface', async () => {
    await openReactNativeVanilla();
    await element(by.id(ids.openNativeSettings)).tap();
    await waitForNativeOverlayVisible(by.label('Settings'), 10000);
  });

  it('navigates to native referrals from the RN surface', async () => {
    await openReactNativeVanilla();
    await element(by.id(ids.openNativeReferrals)).tap();
    await waitForNativeOverlayVisible(by.label('Referrals'), 10000, 0);
  });
});
