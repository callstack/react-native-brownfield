import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createLocalSpmPackage } from '../createLocalSpmPackage.js';

function createXcframework(packageDir: string, name: string) {
  fs.mkdirSync(path.join(packageDir, `${name}.xcframework`), {
    recursive: true,
  });
}

describe('createLocalSpmPackage', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-local-spm-package-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes Package.swift for the required XCFramework set', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermesvm');
    createXcframework(tempDir, 'ReactBrownfield');

    const result = createLocalSpmPackage({
      packageDir: tempDir,
      frameworkName: 'BrownfieldLib',
    });

    expect(result.packageManifestPath).toBe(path.join(tempDir, 'Package.swift'));

    const manifest = fs.readFileSync(result.packageManifestPath, 'utf8');

    expect(manifest).toContain('name: "BrownfieldLibPackage"');
    expect(manifest).toContain('library(name: "BrownfieldLib"');
    expect(manifest).toContain('binaryTarget(name: "BrownfieldLib"');
    expect(manifest).toContain(
      'path: "./spm-artifacts/BrownfieldLib.xcframework"'
    );
    expect(manifest).toContain('binaryTarget(name: "hermesvm"');
    expect(manifest).toContain(
      'path: "./spm-artifacts/hermesvm.xcframework"'
    );
    expect(manifest).toContain('binaryTarget(name: "ReactBrownfield"');
    expect(manifest).toContain(
      'path: "./spm-artifacts/ReactBrownfield.xcframework"'
    );

    expect(
      fs.existsSync(
        path.join(tempDir, 'spm-artifacts', 'BrownfieldLib.xcframework')
      )
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tempDir, 'BrownfieldLib.xcframework'))
    ).toBe(true);

    const readmePath = path.join(tempDir, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);

    const readme = fs.readFileSync(readmePath, 'utf8');
    expect(readme).toContain('# BrownfieldLibPackage');
    expect(readme).toContain('local Swift Package Manager package');
    expect(readme).toContain('BrownfieldLib');
    expect(readme).toContain('Package.swift');
    expect(readme).toContain('## Troubleshooting');
    expect(readme).toContain('missing its bundle executable');
    expect(readme).toContain('same React Native module name');
  });

  it('includes Brownie and BrownfieldNavigation when those XCFrameworks exist', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermesvm');
    createXcframework(tempDir, 'ReactBrownfield');
    createXcframework(tempDir, 'Brownie');
    createXcframework(tempDir, 'BrownfieldNavigation');

    const result = createLocalSpmPackage({
      packageDir: tempDir,
      frameworkName: 'BrownfieldLib',
    });

    const manifest = fs.readFileSync(result.packageManifestPath, 'utf8');

    expect(manifest).toContain('binaryTarget(name: "Brownie"');
    expect(manifest).toContain('path: "./spm-artifacts/Brownie.xcframework"');
    expect(manifest).toContain('binaryTarget(name: "BrownfieldNavigation"');
    expect(manifest).toContain(
      'path: "./spm-artifacts/BrownfieldNavigation.xcframework"'
    );
  });

  it('includes React and ReactNativeDependencies when those XCFrameworks exist', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermesvm');
    createXcframework(tempDir, 'ReactBrownfield');
    createXcframework(tempDir, 'React');
    createXcframework(tempDir, 'ReactNativeDependencies');

    const result = createLocalSpmPackage({
      packageDir: tempDir,
      frameworkName: 'BrownfieldLib',
    });

    const manifest = fs.readFileSync(result.packageManifestPath, 'utf8');

    expect(manifest).toContain('binaryTarget(name: "React"');
    expect(manifest).toContain('path: "./spm-artifacts/React.xcframework"');
    expect(manifest).toContain(
      'binaryTarget(name: "ReactNativeDependencies"'
    );
    expect(manifest).toContain(
      'path: "./spm-artifacts/ReactNativeDependencies.xcframework"'
    );
  });

  it('uses hermes.xcframework when hermesvm.xcframework is not present', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermes');
    createXcframework(tempDir, 'ReactBrownfield');

    const result = createLocalSpmPackage({
      packageDir: tempDir,
      frameworkName: 'BrownfieldLib',
    });

    const manifest = fs.readFileSync(result.packageManifestPath, 'utf8');

    expect(manifest).toContain('binaryTarget(name: "hermes"');
    expect(manifest).toContain('path: "./spm-artifacts/hermes.xcframework"');
  });

  it('throws a clear error when a required XCFramework is missing', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermesvm');

    expect(() =>
      createLocalSpmPackage({
        packageDir: tempDir,
        frameworkName: 'BrownfieldLib',
      })
    ).toThrowError('Missing required XCFramework: ReactBrownfield.xcframework');
  });

  it('detects the packaged app XCFramework when frameworkName is omitted', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermesvm');
    createXcframework(tempDir, 'ReactBrownfield');
    createXcframework(tempDir, 'Brownie');

    const result = createLocalSpmPackage({
      packageDir: tempDir,
    });

    const manifest = fs.readFileSync(result.packageManifestPath, 'utf8');

    expect(manifest).toContain('name: "BrownfieldLibPackage"');
    expect(manifest).toContain('library(name: "BrownfieldLib"');
    expect(manifest).toContain('binaryTarget(name: "BrownfieldLib"');
  });
});
