const { device, element, by, expect: detoxExpect } = require('detox');
const { brownfieldE2eTestIds: ids } = require('@callstack/brownfield-example-shared-tests/e2e/e2eTestIds');
const {
  assertDetoxTextMatches,
  configureDetoxForBrownfieldIos,
  waitForVisibleIgnoringSync,
} = require('@callstack/brownfield-example-shared-tests/e2e/detoxUtils');
const {
  detoxLaunchArgs,
  scrollToNativeShellExpo,
  waitForAppleAppReadyExpo,
  openPostMessageTabExpo,
  sendPostMessageToNativeAndWaitForToast,
} = require('@callstack/brownfield-example-shared-tests/e2e/appleAppDetoxUtils');

describe('Brownfield (AppleApp — Expo)', () => {
  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
      launchArgs: detoxLaunchArgs,
    });
    await configureDetoxForBrownfieldIos();
    await waitForAppleAppReadyExpo();
  });

  it('shows the native greeting shell and embedded Expo home', async () => {
    await scrollToNativeShellExpo();
    const greeting = element(by.id(ids.appleAppGreeting));
    await detoxExpect(greeting).toBeVisible();
    await assertDetoxTextMatches(greeting, /Hello native iOS Expo/);
    await detoxExpect(element(by.label('Home')).atIndex(0)).toBeVisible();
    await detoxExpect(element(by.text(/Welcome to\s+Expo\s+\d+/))).toBeVisible();
  });

  it('shows a native toast when Expo RN sends postMessage', async () => {
    await openPostMessageTabExpo();
    await sendPostMessageToNativeAndWaitForToast(/Hello from Expo!/);
  });

  it('records the RN postMessage bubble in the Expo surface', async () => {
    await openPostMessageTabExpo();
    await element(by.id(ids.sendMessageToNative)).tap();
    const bubble = element(by.id(ids.rnPostMessageText)).atIndex(0);
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      try {
        await assertDetoxTextMatches(bubble, /Hello from Expo!/);
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    await assertDetoxTextMatches(bubble, /Hello from Expo!/);
  });
});
