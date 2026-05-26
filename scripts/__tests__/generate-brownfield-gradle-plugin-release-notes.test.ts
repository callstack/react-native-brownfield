import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findPreviousPluginTag,
  renderReleaseNotes,
  type PluginCommit,
} from '../generate-brownfield-gradle-plugin-release-notes.ts';

test('finds the latest plugin tag older than the target version across legacy tag formats', () => {
  const previousTag = findPreviousPluginTag(
    [
      '@callsack/brownfield-gradle-plugin@0.7.3',
      '@callstack/brownfield-gradle-plugin@v1.0.0',
      'brownfield-gradle-plugin/v1.2.0',
      'brownfield@3.10.0',
    ],
    '1.1.0'
  );

  assert.equal(previousTag, '@callstack/brownfield-gradle-plugin@v1.0.0');
});

test('renders scoped release notes grouped by commit category', () => {
  const commits: PluginCommit[] = [
    {
      hash: '80e6364',
      subject:
        'feat: strip SO files by default, deprecate experimental option in favor of useStrippedSoFiles (#326)',
    },
    {
      hash: 'dd8b8a0',
      subject: 'fix: broken support for custom `appProjectName` in Gradle Plugin (#275)',
    },
    {
      hash: '6ea8da9',
      subject: 'chore: gradle plugin housekeeping (#249)',
    },
    {
      hash: '8e68b38',
      subject: 'refactor(android): simplify debug bundle variant mapping',
    },
    {
      hash: '58dc434',
      subject: 'docs: update landing with new features (#222)',
    },
  ];

  const notes = renderReleaseNotes({
    version: '1.1.0',
    ref: 'HEAD',
    previousTag: '@callstack/brownfield-gradle-plugin@v1.0.0',
    commits,
  });

  assert.match(notes, /^# Brownfield Gradle Plugin 1\.1\.0/m);
  assert.match(
    notes,
    /Compare: `@callstack\/brownfield-gradle-plugin@v1\.0\.0\.\.\.HEAD`/
  );
  assert.match(notes, /## Features[\s\S]*80e6364/);
  assert.match(notes, /## Fixes[\s\S]*dd8b8a0/);
  assert.match(notes, /## Docs[\s\S]*58dc434/);
  assert.match(notes, /## Maintenance[\s\S]*6ea8da9[\s\S]*8e68b38/);
  assert.doesNotMatch(notes, /## Other Changes/);
});

test('renders a fallback heading when no previous plugin tag exists', () => {
  const notes = renderReleaseNotes({
    version: '0.4.0',
    ref: 'HEAD',
    previousTag: null,
    commits: [
      {
        hash: 'af43a84',
        subject: 'chore: bump version to 0.4.0 (#119)',
      },
    ],
  });

  assert.match(notes, /Compare: `initial history\.\.\.HEAD`/);
});
