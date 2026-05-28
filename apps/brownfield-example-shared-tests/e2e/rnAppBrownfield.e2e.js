const assert = require('node:assert/strict');
const { device, element, by, waitFor, expect: detoxExpect } = require('detox');

function detoxAttrsText(attrs) {
  if (!attrs || typeof attrs !== 'object') {
    return '';
  }
  const fragment = (o) =>
    [o.text, o.value, o.label, o.hint]
      .filter((x) => x != null && String(x).length > 0)
      .join('');
  if ('elements' in attrs && Array.isArray(attrs.elements)) {
    return attrs.elements.map(fragment).join('').trim();
  }
  return fragment(attrs).trim();
}

async function assertDetoxTextMatches(nativeElement, pattern) {
  const attrs = await nativeElement.getAttributes();
  assert.match(detoxAttrsText(attrs).trim(), pattern);
}

const ids = {
  rnAppHome: 'brownfield-e2e-rnapp-home',
  rnAppHomeTitle: 'brownfield-e2e-rnapp-home-title',
  sendMessageToNative: 'brownfield-e2e-send-message-native',
  openNativeSettings: 'brownfield-e2e-open-native-settings',
  openNativeReferrals: 'brownfield-e2e-open-native-referrals',
  counterCount: 'brownfield-e2e-counter-count',
  counterIncrement: 'brownfield-e2e-counter-increment',
  rnPostMessageText: 'brownfield-e2e-rn-post-message-text',
};

describe('Brownfield (RNApp)', () => {
  beforeEach(async () => {
    // Full relaunch is more reliable than reloadReactNative() on newer RN/Xcode.
    await device.launchApp({ newInstance: true });
    const home = element(by.id(ids.rnAppHome));
    try {
      await waitFor(home).toBeVisible().withTimeout(45000);
    } catch {
      // Some CI runs start with an unmounted RN surface; one reload usually recovers.
      await device.reloadReactNative();
      await waitFor(home).toBeVisible().withTimeout(45000);
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
