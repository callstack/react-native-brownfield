import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { sanitizeSwiftInterfaces } from '../sanitizeSwiftInterfaces.js';

let tempDir: string | undefined;

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

function writeFile(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

describe('sanitizeSwiftInterfaces', () => {
  it('removes self-imports from emitted Swift interfaces', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swiftinterface-'));
    const moduleDir = path.join(tempDir, 'Brownie.swiftmodule');
    const publicInterface = path.join(
      moduleDir,
      'arm64-apple-ios.swiftinterface'
    );
    const privateInterface = path.join(
      moduleDir,
      'arm64-apple-ios.private.swiftinterface'
    );

    writeFile(
      publicInterface,
      '@_exported import Brownie\nimport Foundation\npublic struct Example {}\n'
    );
    writeFile(
      privateInterface,
      '@_exported import Brownie\nimport Swift\npublic struct Example {}\n'
    );

    const updated = sanitizeSwiftInterfaces({
      moduleName: 'Brownie',
      rootPath: tempDir,
    });

    expect(updated).toBe(2);
    expect(fs.readFileSync(publicInterface, 'utf8')).not.toContain(
      '@_exported import Brownie'
    );
    expect(fs.readFileSync(privateInterface, 'utf8')).not.toContain(
      '@_exported import Brownie'
    );
  });

  it('leaves unrelated imports unchanged', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swiftinterface-'));
    const interfacePath = path.join(
      tempDir,
      'BrownfieldNavigation.swiftmodule',
      'arm64-apple-ios.swiftinterface'
    );

    writeFile(interfacePath, 'import Foundation\npublic struct Example {}\n');

    const updated = sanitizeSwiftInterfaces({
      moduleName: 'BrownfieldNavigation',
      rootPath: tempDir,
    });

    expect(updated).toBe(0);
    expect(fs.readFileSync(interfacePath, 'utf8')).toContain(
      'import Foundation'
    );
  });
});
