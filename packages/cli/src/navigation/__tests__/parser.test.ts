import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { parseNavigationSpec } from '../parser.js';

function createTempSpecFile(contents: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'navigation-parser-'));
  const specPath = path.join(tempDir, 'brownfield.navigation.ts');
  fs.writeFileSync(specPath, contents);
  return specPath;
}

function cleanupTempSpecFile(specPath: string): void {
  fs.rmSync(path.dirname(specPath), { recursive: true, force: true });
}

describe('parseNavigationSpec', () => {
  const tempSpecFiles: string[] = [];

  afterEach(() => {
    for (const specPath of tempSpecFiles) {
      cleanupTempSpecFile(specPath);
    }
    tempSpecFiles.length = 0;
  });

  it('parses methods from BrownfieldNavigationSpec interface', () => {
    const specPath = createTempSpecFile(`
      export interface BrownfieldNavigationSpec {
        openScreen(route: string, params?: Object): void;
      }
    `);
    tempSpecFiles.push(specPath);

    const methods = parseNavigationSpec(specPath);

    expect(methods).toEqual([
      {
        name: 'openScreen',
        params: [
          { name: 'route', type: 'string', optional: false },
          { name: 'params', type: 'Object', optional: true },
        ],
        returnType: 'void',
        isAsync: false,
      },
    ]);
  });

  it('falls back to Spec interface when BrownfieldNavigationSpec is absent', () => {
    const specPath = createTempSpecFile(`
      export interface Spec {
        presentModal(id: string): number;
      }
    `);
    tempSpecFiles.push(specPath);

    const methods = parseNavigationSpec(specPath);

    expect(methods).toEqual([
      {
        name: 'presentModal',
        params: [{ name: 'id', type: 'string', optional: false }],
        returnType: 'number',
        isAsync: false,
      },
    ]);
  });

  it('throws when no valid spec interface is present', () => {
    const specPath = createTempSpecFile(`
      export interface NavigationSpec {
        noOp(): void;
      }
    `);
    tempSpecFiles.push(specPath);

    expect(() => parseNavigationSpec(specPath)).toThrow(
      'Could not find BrownfieldNavigationSpec or Spec interface in spec file'
    );
  });

  it('throws when spec file does not exist', () => {
    expect(() => parseNavigationSpec('/tmp/non-existent-navigation-spec.ts')).toThrow(
      'Spec file not found: /tmp/non-existent-navigation-spec.ts'
    );
  });
});
