const { device, element, by, waitFor, expect: detoxExpect } = require('detox');
const {
  brownfieldE2ETestIds: ids,
} = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  configureDetoxForBrownfieldIos,
  detoxLaunchArgs,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

describe('Brownfield postMessage (Expo demo)', () => {
  beforeEach(async () => {
    // Full relaunch is more reliable than reloadReactNative() on newer RN/Xcode.
    await device.launchApp({
      newInstance: true,
      launchArgs: detoxLaunchArgs,
    });
    await configureDetoxForBrownfieldIos();
    const sendMessageButton = element(by.id(ids.sendMessageToNative));
    try {
      await waitFor(sendMessageButton).toBeVisible().withTimeout(45000);
    } catch {
      // Some CI runs start with an unmounted RN surface; one reload usually recovers.
      await device.reloadReactNative();
      await waitFor(sendMessageButton).toBeVisible().withTimeout(45000);
    }
  });

  it('sends a message to native from the brownfield RN root', async () => {
    await detoxExpect(element(by.id(ids.sendMessageToNative))).toBeVisible();
    await element(by.id(ids.sendMessageToNative)).tap();
    const bubble = element(by.id(ids.rnPostMessageText)).atIndex(0);
    await detoxExpect(bubble).toBeVisible();
    // iOS + Fabric: message text is often not matchable via by.text; attributes still carry it.
    await assertDetoxTextMatches(bubble, /Hello from Expo!/);
  });
});
