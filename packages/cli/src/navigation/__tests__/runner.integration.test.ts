import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

let mockedNavigationPackagePath = '';

vi.mock('../config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config.js')>();
  return {
    ...actual,
    getNavigationPackagePath: vi.fn(() => mockedNavigationPackagePath),
  };
});

vi.mock('../generators/ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../generators/ts.js')>();
  return {
    ...actual,
    transpileWithConsumerBabel: vi.fn(() => '"use strict";module.exports={};'),
  };
});

vi.mock('../generators/models', () => ({
  generateNavigationModels: vi.fn(async () => ({ modelTypeNames: ['UserType'] })),
}));

import { runNavigationCodegen } from '../runner.js';

function createTempProject(): { projectRoot: string; packageRoot: string } {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'navigation-runner-'));
  const packageRoot = path.join(projectRoot, 'mock-navigation-package');

  fs.mkdirSync(path.join(packageRoot, 'src'), { recursive: true });
  fs.mkdirSync(path.join(packageRoot, 'lib', 'commonjs'), { recursive: true });
  fs.mkdirSync(path.join(packageRoot, 'lib', 'module'), { recursive: true });
  fs.mkdirSync(
    path.join(packageRoot, 'lib', 'typescript', 'commonjs', 'src'),
    { recursive: true }
  );
  fs.mkdirSync(path.join(packageRoot, 'lib', 'typescript', 'module', 'src'), {
    recursive: true,
  });
  fs.mkdirSync(path.join(packageRoot, 'ios'), { recursive: true });
  fs.mkdirSync(
    path.join(
      packageRoot,
      'android',
      'src',
      'main',
      'java',
      'com',
      'callstack',
      'nativebrownfieldnavigation'
    ),
    { recursive: true }
  );

  return { projectRoot, packageRoot };
}

describe('runNavigationCodegen integration', () => {
  const tempProjectRoots: string[] = [];

  afterEach(() => {
    for (const projectRoot of tempProjectRoots) {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
    tempProjectRoots.length = 0;
    mockedNavigationPackagePath = '';
  });

  it('runs full codegen flow and writes generated artifacts', async () => {
    const { projectRoot, packageRoot } = createTempProject();
    tempProjectRoots.push(projectRoot);
    mockedNavigationPackagePath = packageRoot;

    fs.writeFileSync(
      path.join(projectRoot, 'brownfield.navigation.ts'),
      `
      export type UserType = {
        id: string;
      };

      export interface BrownfieldNavigationSpec {
        openScreen(route: string, params?: Object): void;
        navigateToSettings(user: UserType): void;
        fetchToken(userId: string): Promise<string>;
      }
      `
    );

    await runNavigationCodegen({ projectRoot });

    const turboModuleSpecPath = path.join(
      packageRoot,
      'src',
      'NativeBrownfieldNavigation.ts'
    );
    const indexTsPath = path.join(packageRoot, 'src', 'index.ts');
    const swiftDelegatePath = path.join(
      packageRoot,
      'ios',
      'BrownfieldNavigationDelegate.swift'
    );
    const kotlinModulePath = path.join(
      packageRoot,
      'android',
      'src',
      'main',
      'java',
      'com',
      'callstack',
      'nativebrownfieldnavigation',
      'NativeBrownfieldNavigationModule.kt'
    );

    expect(fs.existsSync(turboModuleSpecPath)).toBe(true);
    expect(fs.existsSync(indexTsPath)).toBe(true);
    expect(fs.existsSync(swiftDelegatePath)).toBe(true);
    expect(fs.existsSync(kotlinModulePath)).toBe(true);

    expect(fs.readFileSync(turboModuleSpecPath, 'utf8')).toContain('openScreen');
    expect(fs.readFileSync(turboModuleSpecPath, 'utf8')).toContain(
      'export type UserType = {\n        id: string;\n      };'
    );
    expect(fs.readFileSync(turboModuleSpecPath, 'utf8')).toContain(
      'navigateToSettings(user: Object): void;'
    );
    expect(fs.readFileSync(indexTsPath, 'utf8')).toContain('fetchToken');
    expect(fs.readFileSync(indexTsPath, 'utf8')).toContain(
      "import type { UserType } from './NativeBrownfieldNavigation';"
    );
    expect(fs.readFileSync(swiftDelegatePath, 'utf8')).toContain(
      '@objc public protocol BrownfieldNavigationDelegate'
    );
    expect(fs.readFileSync(kotlinModulePath, 'utf8')).toContain(
      'class NativeBrownfieldNavigationModule'
    );
  });

  it('writes generated artifacts to custom output directory', async () => {
    const { projectRoot } = createTempProject();
    tempProjectRoots.push(projectRoot);
    mockedNavigationPackagePath = path.join(projectRoot, 'unused-package-root');

    fs.writeFileSync(
      path.join(projectRoot, 'brownfield.navigation.ts'),
      `
      export interface BrownfieldNavigationSpec {
        openScreen(route: string, params?: Object): void;
      }
      `
    );

    const outputDir = 'tmp/generated-navigation';
    const outputRoot = path.join(projectRoot, outputDir);

    fs.mkdirSync(path.join(outputRoot, 'src'), { recursive: true });
    fs.mkdirSync(path.join(outputRoot, 'lib', 'commonjs'), { recursive: true });
    fs.mkdirSync(path.join(outputRoot, 'lib', 'module'), { recursive: true });
    fs.mkdirSync(path.join(outputRoot, 'lib', 'typescript', 'commonjs', 'src'), {
      recursive: true,
    });
    fs.mkdirSync(path.join(outputRoot, 'lib', 'typescript', 'module', 'src'), {
      recursive: true,
    });
    fs.mkdirSync(path.join(outputRoot, 'ios'), { recursive: true });
    fs.mkdirSync(
      path.join(
        outputRoot,
        'android',
        'src',
        'main',
        'java',
        'com',
        'callstack',
        'nativebrownfieldnavigation'
      ),
      { recursive: true }
    );

    await runNavigationCodegen({ projectRoot, outputDir });

    expect(
      fs.existsSync(
        path.join(outputRoot, 'src', 'NativeBrownfieldNavigation.ts')
      )
    ).toBe(true);
    expect(fs.existsSync(path.join(outputRoot, 'src', 'index.ts'))).toBe(true);
    expect(
      fs.existsSync(
        path.join(outputRoot, 'ios', 'BrownfieldNavigationDelegate.swift')
      )
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          outputRoot,
          'android',
          'src',
          'main',
          'java',
          'com',
          'callstack',
          'nativebrownfieldnavigation',
          'NativeBrownfieldNavigationModule.kt'
        )
      )
    ).toBe(true);
  });
});
