import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { addSourceMock, quicktypeMock } = vi.hoisted(() => ({
  addSourceMock: vi.fn(async (_source: unknown) => undefined),
  quicktypeMock: vi.fn(async ({ lang }: { lang: 'swift' | 'kotlin' }) => ({
    lines:
      lang === 'swift'
        ? [
            '@objcMembers public class UserProfile: NSObject, Codable {}',
            '@objcMembers public class SessionResult: NSObject, Codable {}',
          ]
        : ['data class UserProfile()', 'data class SessionResult()'],
  })),
}));

vi.mock('quicktype-core', () => ({
  FetchingJSONSchemaStore: class {},
  InputData: class {
    addInput(): void {}
  },
  JSONSchemaInput: class {
    async addSource(source: unknown): Promise<void> {
      await addSourceMock(source);
    }
  },
  quicktype: quicktypeMock,
}));

vi.mock('quicktype-typescript-input', () => ({
  schemaForTypeScriptSources: () => ({
    schema: JSON.stringify({
      definitions: {
        UserProfile: { type: 'object' },
        SessionResult: { type: 'object' },
        InternalOnly: { type: 'object' },
      },
    }),
  }),
}));

import { generateNavigationModels } from '../generators/models.js';
import type { MethodSignature } from '../types.js';

function createTempSpecFile(contents: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'navigation-models-'));
  const specPath = path.join(tempDir, 'brownfield.navigation.ts');
  fs.writeFileSync(specPath, contents);
  return specPath;
}

function cleanupTempSpecFile(specPath: string): void {
  fs.rmSync(path.dirname(specPath), { recursive: true, force: true });
}

describe('generateNavigationModels', () => {
  const tempSpecFiles: string[] = [];

  afterEach(() => {
    for (const specPath of tempSpecFiles) {
      cleanupTempSpecFile(specPath);
    }
    tempSpecFiles.length = 0;
    vi.clearAllMocks();
  });

  it('generates models for complex referenced types', async () => {
    const specPath = createTempSpecFile(`
      export interface BrownfieldNavigationSpec {
        openProfile(profile: UserProfile): void;
      }

      export interface UserProfile {}
    `);
    tempSpecFiles.push(specPath);

    const methods: MethodSignature[] = [
      {
        name: 'openProfile',
        params: [{ name: 'profile', type: 'UserProfile', optional: false }],
        returnType: 'void',
        isAsync: false,
      },
    ];

    const models = await generateNavigationModels({
      specPath,
      methods,
      kotlinPackageName: 'com.callstack.nativebrownfieldnavigation',
      modelDefinitions: [
        {
          name: 'UserProfile',
          fields: [
            { name: 'id', type: 'string', optional: false },
            { name: 'name', type: 'string', optional: false },
          ],
        },
      ],
    });

    expect(models.modelTypeNames).toEqual(['UserProfile']);
    expect(models.swiftModels).toContain(
      '@objcMembers public class UserProfile: NSObject, Codable'
    );
    expect(models.swiftModels).toContain(
      '@objc public extension UserProfile'
    );
    expect(models.swiftModels).toContain(
      'static func fromDictionary(_ value: NSDictionary) -> UserProfile'
    );
    expect(models.kotlinModels).toContain('data class UserProfile');
    expect(models.kotlinModels).toContain(
      'import com.facebook.react.bridge.ReadableMap'
    );
    expect(models.kotlinModels).toContain(
      'fun toUserProfile(value: ReadableMap): UserProfile'
    );
    expect(addSourceMock).toHaveBeenCalled();
    expect(quicktypeMock).toHaveBeenCalledTimes(2);
  });

  it('skips model generation when no complex types are referenced', async () => {
    const specPath = createTempSpecFile(`
      export interface BrownfieldNavigationSpec {
        open(route: string): void;
      }
    `);
    tempSpecFiles.push(specPath);

    const methods: MethodSignature[] = [
      {
        name: 'open',
        params: [{ name: 'route', type: 'string', optional: false }],
        returnType: 'void',
        isAsync: false,
      },
    ];

    const models = await generateNavigationModels({
      specPath,
      methods,
      kotlinPackageName: 'com.callstack.nativebrownfieldnavigation',
    });

    expect(models).toEqual({ modelTypeNames: [] });
    expect(quicktypeMock).not.toHaveBeenCalled();
  });
});
