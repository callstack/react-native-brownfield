import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as childProcess from 'node:child_process';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prepareLocalSpmArtifacts } from '../prepareLocalSpmArtifacts.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

function createSignedMockXcframework(packageDir: string, name: string) {
  const frameworkDir = path.join(
    packageDir,
    `${name}.xcframework`,
    'ios-arm64_x86_64-simulator',
    `${name}.framework`
  );
  const codeSignatureDir = path.join(frameworkDir, '_CodeSignature');

  fs.mkdirSync(codeSignatureDir, { recursive: true });
  fs.writeFileSync(path.join(frameworkDir, name), 'mock-binary');
  fs.writeFileSync(path.join(codeSignatureDir, 'CodeResources'), 'signature');
  fs.writeFileSync(path.join(frameworkDir, 'Info.plist'), '<plist/>');
}

describe('prepareLocalSpmArtifacts', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'prepare-local-spm-artifacts-')
    );
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('copies xcframeworks into spm-artifacts and removes embedded code signature data', () => {
    createSignedMockXcframework(tempDir, 'React');

    const spmArtifactsDir = prepareLocalSpmArtifacts({
      packageDir: tempDir,
      targetNames: ['React'],
    });

    const copiedFrameworkDir = path.join(
      spmArtifactsDir,
      'React.xcframework',
      'ios-arm64_x86_64-simulator',
      'React.framework'
    );

    expect(fs.existsSync(path.join(copiedFrameworkDir, 'React'))).toBe(true);
    expect(
      fs.existsSync(
        path.join(copiedFrameworkDir, '_CodeSignature', 'CodeResources')
      )
    ).toBe(false);
    expect(childProcess.execFileSync).toHaveBeenCalledWith(
      'codesign',
      ['--remove-signature', path.join(copiedFrameworkDir, 'React')],
      expect.objectContaining({ stdio: 'pipe' })
    );
    expect(
      fs.existsSync(
        path.join(
          tempDir,
          'React.xcframework',
          'ios-arm64_x86_64-simulator',
          'React.framework',
          '_CodeSignature',
          'CodeResources'
        )
      )
    ).toBe(true);
  });

  it('ignores remove-signature errors for unsigned binaries', () => {
    createSignedMockXcframework(tempDir, 'React');
    vi.mocked(childProcess.execFileSync).mockImplementation(() => {
      throw new Error('code object is not signed at all');
    });

    expect(() =>
      prepareLocalSpmArtifacts({
        packageDir: tempDir,
        targetNames: ['React'],
      })
    ).not.toThrow();
  });
});
