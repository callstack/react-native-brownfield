const { device, element, by, expect: detoxExpect } = require('detox');
const { brownfieldE2ETestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  configureDetoxForBrownfieldAndroid,
  waitForNativeOverlayVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');
const {
  scrollToNativeShellVanilla,
  waitForAndroidAppReadyVanilla,
} = require('@callstack/brownfield-example-shared-tests/e2e/androidAppDetoxUtils');

describe('Brownfield (AndroidApp — Vanilla)', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
    await configureDetoxForBrownfieldAndroid();
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
    const count = element(by.id(ids.counterCount));
    await detoxExpect(count).toBeVisible();
    await assertDetoxTextMatches(count, /Count:\s*0/);
    await element(by.id(ids.counterIncrement)).tap();
    await assertDetoxTextMatches(count, /Count:\s*1/);
  });

  it('records the RN postMessage bubble after sending to native', async () => {
    await element(by.id(ids.sendMessageToNative)).tap();
    const bubble = element(by.id(ids.rnPostMessageText)).atIndex(0);
    await detoxExpect(bubble).toBeVisible();
    await assertDetoxTextMatches(bubble, /Hello from React Native!/);
  });

  it('navigates to native settings from the RN surface', async () => {
    await element(by.id(ids.openNativeSettings)).tap();
    await waitForNativeOverlayVisible(by.id(ids.appleAppNativeSettings), 10000);
  });

  it('navigates to native referrals from the RN surface', async () => {
    await element(by.id(ids.openNativeReferrals)).tap();
    await waitForNativeOverlayVisible(by.id(ids.appleAppNativeReferrals), 10000, 0);
  });
});
