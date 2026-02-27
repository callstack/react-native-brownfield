import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateKotlinDelegate, generateKotlinModule } from '../generators/android.js';
import { generateObjCImplementation, generateSwiftDelegate } from '../generators/ios.js';
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
