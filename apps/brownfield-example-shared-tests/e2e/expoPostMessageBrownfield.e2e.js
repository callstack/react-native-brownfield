const assert = require('node:assert/strict');
const { device, element, by, waitFor, expect: detoxExpect } = require('detox');

const ids = {
  sendMessageToNative: 'brownfield-e2e-send-message-native',
  rnPostMessageText: 'brownfield-e2e-rn-post-message-text',
};

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

const sendMessageToNative = ids.sendMessageToNative;

describe('Brownfield postMessage (Expo demo)', () => {
  beforeEach(async () => {
    // Full relaunch is more reliable than reloadReactNative() on newer RN/Xcode.
    await device.launchApp({
      newInstance: true,
      launchArgs: { BrownfieldPreferEmbeddedBundleInDebug: 'YES' },
    });
    const sendMessageButton = element(by.id(sendMessageToNative));
    try {
      await waitFor(sendMessageButton).toBeVisible().withTimeout(45000);
    } catch {
      // Some CI runs start with an unmounted RN surface; one reload usually recovers.
      await device.reloadReactNative();
      await waitFor(sendMessageButton).toBeVisible().withTimeout(45000);
    }
  });

  it('sends a message to native from the brownfield RN root', async () => {
    await detoxExpect(element(by.id(sendMessageToNative))).toBeVisible();
    await element(by.id(sendMessageToNative)).tap();
    const bubble = element(by.id(ids.rnPostMessageText)).atIndex(0);
    await detoxExpect(bubble).toBeVisible();
    // iOS + Fabric: message text is often not matchable via by.text; attributes still carry it.
    await assertDetoxTextMatches(bubble, /Hello from Expo!/);
  });
});
