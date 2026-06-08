const assert = require('node:assert/strict');
const { device, element, waitFor, expect: detoxExpect } = require('detox');

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

/** Ignore Metro / packager polling so Detox does not wait forever in Debug without a dev server. */
async function configureDetoxForBrownfieldIos() {
  await device.setURLBlacklist([
    'http://localhost:8081.*',
    'http://127.0.0.1:8081.*',
    'http://.*:8081.*',
  ]);
}

async function waitForVisible(matcher, timeoutMs = 20000) {
  await waitFor(element(matcher)).toBeVisible().withTimeout(timeoutMs);
}

/**
 * Poll visibility with synchronization disabled (RN Debug keeps the run loop "busy").
 * Do not use waitFor().toBeVisible() while sync is off — it returns immediately.
 */
async function waitForVisibleIgnoringSync(matcher, timeoutMs = 20000, index = 0) {
  await device.disableSynchronization();
  try {
    const deadline = Date.now() + timeoutMs;
    const target = () => element(matcher).atIndex(index);
    while (Date.now() < deadline) {
      try {
        await detoxExpect(target()).toBeVisible();
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    await detoxExpect(target()).toBeVisible();
  } finally {
    await device.enableSynchronization();
  }
}

module.exports = {
  detoxAttrsText,
  assertDetoxTextMatches,
  configureDetoxForBrownfieldIos,
  waitForVisible,
  waitForVisibleIgnoringSync,
};
