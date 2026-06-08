const assert = require('node:assert/strict');

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

module.exports = {
  detoxAttrsText,
  assertDetoxTextMatches,
};
