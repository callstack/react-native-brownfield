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
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'create-local-spm-package-')
    );
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

    expect(result.packageManifestPath).toBe(
      path.join(tempDir, 'Package.swift')
    );

    const manifest = fs.readFileSync(result.packageManifestPath, 'utf8');

    expect(manifest).toContain('name: "BrownfieldLibPackage"');
    expect(manifest).toContain('library(name: "BrownfieldLib"');
    expect(manifest).toContain('binaryTarget(name: "BrownfieldLib"');
    expect(manifest).toContain(
      'path: "./spm-artifacts/BrownfieldLib.xcframework"'
    );
    expect(manifest).toContain('binaryTarget(name: "hermesvm"');
    expect(manifest).toContain('path: "./spm-artifacts/hermesvm.xcframework"');
    expect(manifest).toContain('binaryTarget(name: "ReactBrownfield"');
    expect(manifest).toContain(
      'path: "./spm-artifacts/ReactBrownfield.xcframework"'
    );

    expect(
      fs.existsSync(
        path.join(tempDir, 'spm-artifacts', 'BrownfieldLib.xcframework')
      )
    ).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'BrownfieldLib.xcframework'))).toBe(
      false
    );

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
    expect(manifest).toContain('binaryTarget(name: "ReactNativeDependencies"');
    expect(manifest).toContain(
      'path: "./spm-artifacts/ReactNativeDependencies.xcframework"'
    );
  });

  it('includes Expo support XCFrameworks when those artifacts exist', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermesvm');
    createXcframework(tempDir, 'ReactBrownfield');
    createXcframework(tempDir, 'ExpoModulesJSI');
    createXcframework(tempDir, 'ExpoFileSystem');
    createXcframework(tempDir, 'ExpoFont');

    const result = createLocalSpmPackage({
      packageDir: tempDir,
      frameworkName: 'BrownfieldLib',
    });

    const manifest = fs.readFileSync(result.packageManifestPath, 'utf8');

    expect(manifest).toContain('binaryTarget(name: "ExpoModulesJSI"');
    expect(manifest).toContain('binaryTarget(name: "ExpoFileSystem"');
    expect(manifest).toContain(
      'path: "./spm-artifacts/ExpoFileSystem.xcframework"'
    );
    expect(manifest).toContain('binaryTarget(name: "ExpoFont"');
    expect(manifest).toContain('path: "./spm-artifacts/ExpoFont.xcframework"');
  });

  it('limits Expo support XCFrameworks to ExpoModulesJSI when prebuilt Expo is disabled', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermesvm');
    createXcframework(tempDir, 'ReactBrownfield');
    createXcframework(tempDir, 'ExpoModulesJSI');
    createXcframework(tempDir, 'ExpoFileSystem');
    createXcframework(tempDir, 'ExpoFont');

    const result = createLocalSpmPackage({
      packageDir: tempDir,
      frameworkName: 'BrownfieldLib',
      usePrebuiltExpo: false,
    });

    const manifest = fs.readFileSync(result.packageManifestPath, 'utf8');

    expect(manifest).toContain('binaryTarget(name: "ExpoModulesJSI"');
    expect(manifest).not.toContain('binaryTarget(name: "ExpoFileSystem"');
    expect(manifest).not.toContain('binaryTarget(name: "ExpoFont"');
    expect(
      fs.existsSync(
        path.join(tempDir, 'spm-artifacts', 'ExpoModulesJSI.xcframework')
      )
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tempDir, 'spm-artifacts', 'ExpoFileSystem.xcframework'))
    ).toBe(false);
    expect(
      fs.existsSync(path.join(tempDir, 'spm-artifacts', 'ExpoFont.xcframework'))
    ).toBe(false);
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

  it('copies declared extra SPM XCFrameworks into the package as binary targets', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermesvm');
    createXcframework(tempDir, 'ReactBrownfield');

    const projectRoot = path.join(tempDir, 'project');
    const extraSourcePath = path.join(
      projectRoot,
      'artifacts',
      'MyHostModule.xcframework'
    );
    fs.mkdirSync(extraSourcePath, { recursive: true });
    fs.writeFileSync(path.join(extraSourcePath, 'Info.plist'), 'extra');

    const result = createLocalSpmPackage({
      packageDir: tempDir,
      frameworkName: 'BrownfieldLib',
      projectRoot,
      extraSpmXcframeworks: [
        { name: 'MyHostModule', path: './artifacts/MyHostModule.xcframework' },
      ],
    });

    const manifest = fs.readFileSync(result.packageManifestPath, 'utf8');

    expect(manifest).toContain('binaryTarget(name: "MyHostModule"');
    expect(manifest).toContain(
      'path: "./spm-artifacts/MyHostModule.xcframework"'
    );
    expect(manifest).toContain('"MyHostModule"');
    expect(
      fs.existsSync(
        path.join(tempDir, 'spm-artifacts', 'MyHostModule.xcframework', 'Info.plist')
      )
    ).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'MyHostModule.xcframework'))).toBe(
      false
    );
    expect(
      fs.readFileSync(
        path.join(
          tempDir,
          'spm-artifacts',
          'MyHostModule.xcframework',
          'Info.plist'
        ),
        'utf8'
      )
    ).toBe('extra');
  });

  it('reserves extra SPM XCFramework names during app-framework auto-detection', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermesvm');
    createXcframework(tempDir, 'ReactBrownfield');
    createXcframework(tempDir, 'MyHostModule');

    const projectRoot = path.join(tempDir, 'project');
    const extraSourcePath = path.join(
      projectRoot,
      'artifacts',
      'MyHostModule.xcframework'
    );
    fs.mkdirSync(extraSourcePath, { recursive: true });

    const result = createLocalSpmPackage({
      packageDir: tempDir,
      projectRoot,
      extraSpmXcframeworks: [
        { name: 'MyHostModule', path: './artifacts/MyHostModule.xcframework' },
      ],
    });

    const manifest = fs.readFileSync(result.packageManifestPath, 'utf8');

    expect(manifest).toContain('name: "BrownfieldLibPackage"');
    expect(manifest).toContain('library(name: "BrownfieldLib"');
    expect(manifest).toContain('binaryTarget(name: "MyHostModule"');
  });

  it('throws a clear error when an extra SPM XCFramework path is missing', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermesvm');
    createXcframework(tempDir, 'ReactBrownfield');

    expect(() =>
      createLocalSpmPackage({
        packageDir: tempDir,
        frameworkName: 'BrownfieldLib',
        projectRoot: tempDir,
        extraSpmXcframeworks: [
          {
            name: 'MyHostModule',
            path: './missing/MyHostModule.xcframework',
          },
        ],
      })
    ).toThrowError(
      'Missing extra SPM XCFramework "MyHostModule" at ./missing/MyHostModule.xcframework'
    );
  });

  it('keeps Package.swift identical when extraSpmXcframeworks is empty', () => {
    const baselineDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'create-local-spm-package-baseline-')
    );

    try {
      for (const dir of [tempDir, baselineDir]) {
        createXcframework(dir, 'BrownfieldLib');
        createXcframework(dir, 'hermesvm');
        createXcframework(dir, 'ReactBrownfield');
        createXcframework(dir, 'Brownie');
      }

      const baseline = createLocalSpmPackage({
        packageDir: baselineDir,
        frameworkName: 'BrownfieldLib',
      });
      const withEmptyExtras = createLocalSpmPackage({
        packageDir: tempDir,
        frameworkName: 'BrownfieldLib',
        extraSpmXcframeworks: [],
      });

      expect(fs.readFileSync(withEmptyExtras.packageManifestPath, 'utf8')).toBe(
        fs.readFileSync(baseline.packageManifestPath, 'utf8')
      );
      expect(fs.readFileSync(path.join(tempDir, 'README.md'), 'utf8')).toBe(
        fs.readFileSync(path.join(baselineDir, 'README.md'), 'utf8')
      );
    } finally {
      fs.rmSync(baselineDir, { recursive: true, force: true });
    }
  });

  it('includes multiple declared extra SPM XCFrameworks', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermesvm');
    createXcframework(tempDir, 'ReactBrownfield');

    const projectRoot = path.join(tempDir, 'project');
    for (const name of ['MyHostModule', 'DesignSystem']) {
      fs.mkdirSync(path.join(projectRoot, 'artifacts', `${name}.xcframework`), {
        recursive: true,
      });
    }

    const result = createLocalSpmPackage({
      packageDir: tempDir,
      frameworkName: 'BrownfieldLib',
      projectRoot,
      extraSpmXcframeworks: [
        { name: 'MyHostModule', path: './artifacts/MyHostModule.xcframework' },
        { name: 'DesignSystem', path: './artifacts/DesignSystem.xcframework' },
      ],
    });

    const manifest = fs.readFileSync(result.packageManifestPath, 'utf8');

    expect(manifest).toContain('binaryTarget(name: "MyHostModule"');
    expect(manifest).toContain('binaryTarget(name: "DesignSystem"');
    expect(manifest).toContain(
      'targets: ["BrownfieldLib", "hermesvm", "ReactBrownfield", "MyHostModule", "DesignSystem"]'
    );
    expect(
      fs.existsSync(
        path.join(tempDir, 'spm-artifacts', 'MyHostModule.xcframework')
      )
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tempDir, 'spm-artifacts', 'DesignSystem.xcframework')
      )
    ).toBe(true);
  });

  it('resolves absolute extra SPM XCFramework paths', () => {
    createXcframework(tempDir, 'BrownfieldLib');
    createXcframework(tempDir, 'hermesvm');
    createXcframework(tempDir, 'ReactBrownfield');

    const absoluteExtraPath = path.join(
      tempDir,
      'absolute-artifacts',
      'MyHostModule.xcframework'
    );
    fs.mkdirSync(absoluteExtraPath, { recursive: true });
    fs.writeFileSync(path.join(absoluteExtraPath, 'marker.txt'), 'absolute');

    const result = createLocalSpmPackage({
      packageDir: tempDir,
      frameworkName: 'BrownfieldLib',
      projectRoot: path.join(tempDir, 'unused-project-root'),
      extraSpmXcframeworks: [
        { name: 'MyHostModule', path: absoluteExtraPath },
      ],
    });

    const manifest = fs.readFileSync(result.packageManifestPath, 'utf8');

    expect(manifest).toContain('binaryTarget(name: "MyHostModule"');
    expect(
      fs.readFileSync(
        path.join(
          tempDir,
          'spm-artifacts',
          'MyHostModule.xcframework',
          'marker.txt'
        ),
        'utf8'
      )
    ).toBe('absolute');
  });
});
