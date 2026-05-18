import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolvePackagedFrameworkName } from '../resolvePackagedFrameworkName.js';

function createFramework(baseDir: string, frameworkName: string, withBundle = false) {
  const frameworkPath = path.join(baseDir, `${frameworkName}.framework`);
  fs.mkdirSync(frameworkPath, { recursive: true });
  fs.writeFileSync(path.join(frameworkPath, frameworkName), 'fake binary');

  if (withBundle) {
    fs.writeFileSync(path.join(frameworkPath, 'main.jsbundle'), 'bundled js');
  }
}

describe('resolvePackagedFrameworkName', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-packaged-framework-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('prefers the explicit scheme when provided', () => {
    expect(
      resolvePackagedFrameworkName({
        explicitScheme: 'BrownfieldLib',
        productsPath: tempDir,
        configuration: 'Debug',
      })
    ).toEqual({
      frameworkName: 'BrownfieldLib',
      resolution: 'explicit',
    });
  });

  it('resolves the packaged framework automatically from the device build output', () => {
    const deviceProductsPath = path.join(tempDir, 'Debug-iphoneos');
    createFramework(deviceProductsPath, 'BrownfieldLib', true);
    createFramework(path.join(deviceProductsPath, 'Brownie'), 'Brownie');
    createFramework(path.join(deviceProductsPath, 'BrownfieldNavigation'), 'BrownfieldNavigation');

    expect(
      resolvePackagedFrameworkName({
        productsPath: tempDir,
        configuration: 'Debug',
      })
    ).toEqual({
      frameworkName: 'BrownfieldLib',
      resolution: 'detected',
    });
  });

  it('reports when the framework cannot be resolved automatically', () => {
    const deviceProductsPath = path.join(tempDir, 'Debug-iphoneos');
    createFramework(path.join(deviceProductsPath, 'Brownie'), 'Brownie');

    expect(
      resolvePackagedFrameworkName({
        productsPath: tempDir,
        configuration: 'Debug',
      })
    ).toEqual({
      frameworkName: null,
      resolution: 'not_found',
      candidates: [],
    });
  });

  it('reports ambiguity when multiple frameworks contain a packaged bundle', () => {
    const deviceProductsPath = path.join(tempDir, 'Debug-iphoneos');
    createFramework(deviceProductsPath, 'BrownfieldLib', true);
    createFramework(deviceProductsPath, 'OtherFramework', true);

    expect(
      resolvePackagedFrameworkName({
        productsPath: tempDir,
        configuration: 'Debug',
      })
    ).toEqual({
      frameworkName: null,
      resolution: 'ambiguous',
      candidates: ['BrownfieldLib', 'OtherFramework'],
    });
  });
});
