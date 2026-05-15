import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateKotlinDelegate, generateKotlinModule } from '../generators/android.js';
import {
  generateObjCImplementation,
  generateSwiftDelegate,
} from '../generators/ios.js';
import {
  generateIndexDts,
  generateIndexTs,
  generateTurboModuleSpec,
} from '../generators/ts.js';
import type { MethodSignature } from '../types.js';

const methods: MethodSignature[] = [
  {
    name: 'openScreen',
    params: [
      { name: 'route', type: 'string', optional: false },
      { name: 'params', type: 'Object', optional: true },
    ],
    returnType: 'void',
    isAsync: false,
  },
];

const modelMethods: MethodSignature[] = [
  {
    name: 'openSettings',
    params: [{ name: 'payload', type: 'DummyType', optional: false }],
    returnType: 'void',
    isAsync: false,
  },
  {
    name: 'openSettingsOptional',
    params: [{ name: 'payload', type: 'DummyType', optional: true }],
    returnType: 'void',
    isAsync: false,
  },
];

describe('navigation code generators', () => {
  it('generates TurboModule spec and index files', () => {
    const turboModuleSpec = generateTurboModuleSpec(methods);
    const indexTs = generateIndexTs(methods);
    const indexDts = generateIndexDts(methods);

    expect(turboModuleSpec).toContain('export interface Spec extends TurboModule');
    expect(turboModuleSpec).toContain('openScreen(route: string, params?: Object): void;');

    expect(indexTs).toContain('openScreen: (route: string, params?: Object)');
    expect(indexTs).toContain('NativeBrownfieldNavigation.openScreen(route, params)');

    expect(indexDts).toContain('openScreen: (route: string, params?: Object) => void;');
  });

  it('includes referenced custom type declarations in TurboModule spec', () => {
    const turboModuleSpec = generateTurboModuleSpec(
      [
        {
          name: 'navigateToSettings',
          params: [{ name: 'user', type: 'UserType', optional: false }],
          returnType: 'void',
          isAsync: false,
        },
      ],
      [
        {
          name: 'UserType',
          declaration: 'export type UserType = { id: string; };',
        },
      ],
      {
        modelTypeNames: ['UserType'],
      }
    );

    expect(turboModuleSpec).toContain('export type UserType = { id: string; };');
    expect(turboModuleSpec).toContain(
      'navigateToSettings(user: Object): void;'
    );
  });

  it('imports referenced custom types into generated index files', () => {
    const customTypeMethods: MethodSignature[] = [
      {
        name: 'navigateToSettings',
        params: [{ name: 'user', type: 'UserType', optional: false }],
        returnType: 'void',
        isAsync: false,
      },
    ];
    const referencedTypeDeclarations = [
      {
        name: 'UserType',
        declaration: 'export type UserType = { id: string; };',
      },
    ];

    const indexTs = generateIndexTs(
      customTypeMethods,
      referencedTypeDeclarations
    );
    const indexDts = generateIndexDts(
      customTypeMethods,
      referencedTypeDeclarations
    );

    expect(indexTs).toContain(
      "import type { UserType } from './NativeBrownfieldNavigation';"
    );
    expect(indexTs).toContain('navigateToSettings: (user: UserType)');
    expect(indexDts).toContain(
      "import type { UserType } from './NativeBrownfieldNavigation';"
    );
    expect(indexDts).toContain(
      'navigateToSettings: (user: UserType) => void;'
    );
  });

  it('generates iOS bindings for sync methods', () => {
    const swiftDelegate = generateSwiftDelegate(methods);
    const objcImplementation = generateObjCImplementation(methods);

    expect(swiftDelegate).toContain('@objc public protocol BrownfieldNavigationDelegate');
    expect(swiftDelegate).toContain('@objc func openScreen(_ route: String, params params: [String: Any]?)');

    expect(objcImplementation).toContain('- (void)openScreen:(NSString *)route params:(NSDictionary * _Nullable)params');
    expect(objcImplementation).toContain(
      '[[[BrownfieldNavigationManager shared] getDelegate] openScreen:route params:params];'
    );
  });

  it('generates Android bindings for sync methods', () => {
    const kotlinPackageName = 'com.callstack.nativebrownfieldnavigation';
    const kotlinDelegate = generateKotlinDelegate(methods, kotlinPackageName);
    const kotlinModule = generateKotlinModule(methods, kotlinPackageName);

    expect(kotlinDelegate).toContain(`package ${kotlinPackageName}`);
    expect(kotlinDelegate).toContain('fun openScreen(route: String, params: ReadableMap?)');

    expect(kotlinModule).toContain('import com.facebook.react.bridge.ReadableMap');
    expect(kotlinModule).toContain(
      'override fun openScreen(route: String, params: ReadableMap?)'
    );
    expect(kotlinModule).toContain(
      'BrownfieldNavigationManager.getDelegate().openScreen(route, params)'
    );
  });

  it('maps known model types for Swift delegate signatures', () => {
    const swiftDelegate = generateSwiftDelegate(modelMethods, {
      modelTypeNames: ['DummyType'],
    });

    expect(swiftDelegate).toContain(
      '@objc func openSettings(_ payload: DummyType)'
    );
    expect(swiftDelegate).toContain(
      '@objc func openSettingsOptional(_ payload: DummyType?)'
    );
  });

  it('maps known model types for Kotlin delegate/module signatures', () => {
    const kotlinPackageName = 'com.callstack.nativebrownfieldnavigation';
    const options = {
      modelTypeNames: ['DummyType'],
    };
    const kotlinDelegate = generateKotlinDelegate(
      modelMethods,
      kotlinPackageName,
      options
    );
    const kotlinModule = generateKotlinModule(
      modelMethods,
      kotlinPackageName,
      options
    );

    expect(kotlinDelegate).toContain('fun openSettings(payload: DummyType)');
    expect(kotlinDelegate).toContain('fun openSettingsOptional(payload: DummyType?)');
    expect(kotlinModule).toContain(
      'override fun openSettings(payload: ReadableMap)'
    );
    expect(kotlinModule).toContain(
      'override fun openSettingsOptional(payload: ReadableMap?)'
    );
    expect(kotlinModule).toContain(
      'val payloadModel = payload.let(::toDummyType)'
    );
    expect(kotlinModule).toContain(
      'BrownfieldNavigationManager.getDelegate().openSettings(payloadModel)'
    );
    expect(kotlinModule).toContain(
      'val payloadModel = payload?.let(::toDummyType)'
    );
    expect(kotlinModule).not.toContain('payload: Any');
    expect(kotlinModule).not.toContain('payload: Any?');
  });

  it('uses NSDictionary model args and converts before delegate calls', () => {
    const objcImplementation = generateObjCImplementation(modelMethods, {
      modelTypeNames: ['DummyType'],
    });

    expect(objcImplementation).toContain(
      '- (void)openSettings:(NSDictionary *)payload'
    );
    expect(objcImplementation).toContain(
      '- (void)openSettingsOptional:(NSDictionary * _Nullable)payload'
    );
    expect(objcImplementation).toContain(
      'DummyType *payloadModel = payload == nil ? nil : [DummyType fromDictionary:payload];'
    );
    expect(objcImplementation).toContain(
      'openSettings:payloadModel'
    );
  });
});

describe('transpileWithConsumerBabel dependency errors', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unmock('node:module');
  });

  it('throws a clear error when @babel/core cannot be resolved', async () => {
    vi.doMock('node:module', () => ({
      createRequire: () => ({
        resolve: () => {
          throw new Error('module not found');
        },
      }),
    }));

    const { transpileWithConsumerBabel } = await import('../generators/ts.js');

    expect(() =>
      transpileWithConsumerBabel(
        'const value: string = "hello"; export default value;',
        '/tmp/project',
        '/tmp/package'
      )
    ).toThrow('Could not resolve "@babel/core". Install it in your app devDependencies.');
  });
});
