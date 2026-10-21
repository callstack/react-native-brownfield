const assert = require('node:assert/strict');
const test = require('node:test');
const { brownfieldE2ETestIds } = require('./e2e/e2eTestIds.cjs');

test('Detox identifiers match the identifiers bundled in the demo apps', async () => {
  const runtime = await import('../shared-runtime/src/e2eTestIds.ts');
  assert.deepEqual(brownfieldE2ETestIds, runtime.brownfieldE2ETestIds);
});
