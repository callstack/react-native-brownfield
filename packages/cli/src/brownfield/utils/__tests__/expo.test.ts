import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { usesContinuousNativeGeneration } from '../expo.js';

describe('usesContinuousNativeGeneration', () => {
  let tempDir: string | null = null;

  function createGitProject(gitignore?: string): string {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brownfield-cng-'));
    execFileSync('git', ['init', '-q'], { cwd: tempDir });
    if (gitignore) {
      fs.writeFileSync(path.join(tempDir, '.gitignore'), gitignore);
    }
    return tempDir;
  }

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('returns true when the native directory does not exist', () => {
    const projectRoot = createGitProject();

    expect(usesContinuousNativeGeneration(projectRoot, 'android')).toBe(true);
  });

  it('returns true when the native directory is gitignored (Expo CNG)', () => {
    const projectRoot = createGitProject('/android\n/ios\n');
    fs.mkdirSync(path.join(projectRoot, 'android'));
    fs.mkdirSync(path.join(projectRoot, 'ios'));

    expect(usesContinuousNativeGeneration(projectRoot, 'android')).toBe(true);
    expect(usesContinuousNativeGeneration(projectRoot, 'ios')).toBe(true);
  });

  it('returns false for a bare app whose native directory is committed', () => {
    const projectRoot = createGitProject();
    fs.mkdirSync(path.join(projectRoot, 'android'));

    expect(usesContinuousNativeGeneration(projectRoot, 'android')).toBe(false);
  });

  it('returns false when the native directory exists outside a git repository', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brownfield-cng-'));
    fs.mkdirSync(path.join(tempDir, 'ios'));

    expect(usesContinuousNativeGeneration(tempDir, 'ios')).toBe(false);
  });
});
