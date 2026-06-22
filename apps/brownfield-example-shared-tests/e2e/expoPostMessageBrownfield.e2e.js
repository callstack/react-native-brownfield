const { device, element, by, expect: detoxExpect } = require('detox');
const {
  brownfieldE2ETestIds: ids,
} = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  launchBrownfieldAppForDetox,
  waitForVisible,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');

async function openPostMessageTab() {
  await device.disableSynchronization();
  await waitForVisible(by.label('postMessage API'), 45000);
  await element(by.label('postMessage API')).atIndex(0).tap();
  await waitForVisible(by.id(ids.sendMessageToNative), 45000);
}

describe('Brownfield postMessage (Expo demo)', () => {
  beforeEach(async () => {
    await launchBrownfieldAppForDetox({ newInstance: true });
    try {
      await openPostMessageTab();
    } catch {
      await device.reloadReactNative();
      await openPostMessageTab();
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
