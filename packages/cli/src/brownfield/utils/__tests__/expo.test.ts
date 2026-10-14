import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { logger } from '@rock-js/tools';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  runExpoPrebuildIfNeeded,
  usesContinuousNativeGeneration,
} from '../expo.js';

vi.mock('../project.js', () => ({
  isExpoProject: vi.fn(() => true),
}));

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
    vi.restoreAllMocks();
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

    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});

    expect(usesContinuousNativeGeneration(tempDir, 'ios')).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "Couldn't check with git whether ios/ is gitignored"
      )
    );
  });

  it('skips expo prebuild for a committed native directory', async () => {
    const projectRoot = createGitProject();
    fs.mkdirSync(path.join(projectRoot, 'ios'));
    const info = vi.spyOn(logger, 'info').mockImplementation(() => {});

    await expect(
      runExpoPrebuildIfNeeded({ projectRoot, platform: 'ios' })
    ).resolves.toBe(false);
    expect(info).toHaveBeenCalledWith(
      'Expo modules detected in a project with a committed ios directory. Skipping expo prebuild.'
    );
  });
});
