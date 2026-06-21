const { device, element, by, expect: detoxExpect } = require('detox');
const {
  brownfieldE2ETestIds: ids,
} = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  launchBrownfieldAppForDetox,
  waitForVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

describe('Brownfield (RNApp)', () => {
  beforeAll(async () => {
    await launchBrownfieldAppForDetox({ newInstance: true });
    try {
      await waitForVisible(by.id(ids.rnAppHome), 45000);
    } catch {
      await device.reloadReactNative();
      await waitForVisible(by.id(ids.rnAppHome), 45000);
    }
  });

  it('shows the brownfield home surface', async () => {
    await detoxExpect(element(by.id(ids.rnAppHome))).toBeVisible();
    const title = element(by.id(ids.rnAppHomeTitle));
    await detoxExpect(title).toBeVisible();
    // iOS + Fabric often omit text from Detox's toHaveText; attributes still carry it.
    await assertDetoxTextMatches(title, /React Native Screen/);
  });

  it('increments the shared-store counter', async () => {
    const count = element(by.id(ids.counterCount));
    await detoxExpect(count).toBeVisible();
    await assertDetoxTextMatches(count, /Count:\s*0/);
    await element(by.id(ids.counterIncrement)).tap();
    await assertDetoxTextMatches(count, /Count:\s*1/);
  });

  it('fires postMessage when sending to native', async () => {
    await element(by.id(ids.sendMessageToNative)).tap();
    const bubble = element(by.id(ids.rnPostMessageText)).atIndex(0);
    await detoxExpect(bubble).toBeVisible();
    await assertDetoxTextMatches(bubble, /Hello from React Native!/);
  });

  it('shows brownfield native navigation actions', async () => {
    await detoxExpect(element(by.id(ids.openNativeSettings))).toBeVisible();
    await detoxExpect(element(by.id(ids.openNativeReferrals))).toBeVisible();
  });
});
