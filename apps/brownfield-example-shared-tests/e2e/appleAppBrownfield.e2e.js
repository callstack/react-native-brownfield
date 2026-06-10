const { device, element, by, expect: detoxExpect } = require('detox');
const { brownfieldE2eTestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  configureDetoxForBrownfieldIos,
  waitForVisibleIgnoringSync,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');
const {
  detoxLaunchArgs,
  scrollToEmbeddedRnVanilla,
  scrollToNativeShellVanilla,
  waitForAppleAppReadyVanilla,
} = require('@callstack/brownfield-example-shared-tests/e2e/appleAppDetoxUtils');

describe('Brownfield (AppleApp — Vanilla)', () => {
  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
      launchArgs: detoxLaunchArgs,
    });
    await configureDetoxForBrownfieldIos();
    await waitForAppleAppReadyVanilla();
  });

  it('shows the native greeting shell and embedded RN home', async () => {
    await scrollToNativeShellVanilla();
    await detoxExpect(element(by.id(ids.appleAppGreeting))).toBeVisible();
    await detoxExpect(element(by.id(ids.rnAppHome))).toBeVisible();
    const title = element(by.id(ids.rnAppHomeTitle));
    await detoxExpect(title).toBeVisible();
    await assertDetoxTextMatches(title, /React Native Screen/);
  });

  it('increments the native SwiftUI counter', async () => {
    await scrollToNativeShellVanilla();
    const counter = element(by.id(ids.appleAppNativeCounter));
    await detoxExpect(counter).toBeVisible();
    await assertDetoxTextMatches(counter, /You clicked the button 0 times/);
    await element(by.id(ids.appleAppNativeIncrement)).tap();
    await assertDetoxTextMatches(counter, /You clicked the button 1 time/);
  });

  it('increments the embedded RN shared-store counter', async () => {
    const count = element(by.id(ids.counterCount));
    await detoxExpect(count).toBeVisible();
    await assertDetoxTextMatches(count, /Count:\s*0/);
    await element(by.id(ids.counterIncrement)).tap();
    await assertDetoxTextMatches(count, /Count:\s*1/);
  });

  it('shows a native toast when RN sends postMessage', async () => {
    await element(by.id(ids.sendMessageToNative)).tap();
    await waitForVisibleIgnoringSync(by.id(ids.appleAppPostMessageToast), 5000);
  });

  it('navigates to native settings from the RN surface', async () => {
    await element(by.id(ids.openNativeSettings)).tap();
    await waitForVisibleIgnoringSync(by.label('Settings'), 10000);
  });

  it('navigates to native referrals from the RN surface', async () => {
    await element(by.id(ids.openNativeReferrals)).tap();
    await waitForVisibleIgnoringSync(by.label('Referrals'), 10000, 0);
  });
});
