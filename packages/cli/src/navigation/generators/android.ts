import type { MethodSignature } from '../types.js';

const TS_TO_KOTLIN_TYPE: Record<string, string> = {
  string: 'String',
  number: 'Double',
  boolean: 'Boolean',
  void: 'Unit',
  Object: 'ReadableMap',
};

function mapTsTypeToKotlin(tsType: string, optional: boolean = false): string {
  if (tsType.startsWith('Promise<')) {
    const inner = tsType.slice(8, -1);
    return mapTsTypeToKotlin(inner, optional);
  }

  const mapped = TS_TO_KOTLIN_TYPE[tsType];
  if (mapped) {
    return optional ? `${mapped}?` : mapped;
  }

  return optional ? 'Any?' : 'Any';
}

export function generateKotlinDelegate(
  methods: MethodSignature[],
  kotlinPackageName: string
): string {
  const methodSignatures = methods
    .map((method) => {
      const params = method.params
        .map(
          (param) =>
            `${param.name}: ${mapTsTypeToKotlin(param.type, param.optional)}`
        )
        .join(', ');
      const returnType =
        method.returnType === 'void'
          ? ''
          : `: ${mapTsTypeToKotlin(method.returnType, false)}`;
      return `  fun ${method.name}(${params})${returnType}`;
    })
    .join('\n');

  return `package ${kotlinPackageName}

interface BrownfieldNavigationDelegate {
${methodSignatures}
}
`;
}

export function generateKotlinModule(
  methods: MethodSignature[],
  kotlinPackageName: string
): string {
  const hasAsyncMethod = methods.some((method) => method.isAsync);
  const hasObjectType = methods.some(
    (method) =>
      method.returnType.includes('Object') ||
      method.params.some((param) => param.type === 'Object')
  );

  const methodImplementations = methods
    .map((method) =>
      method.isAsync
        ? generateAsyncKotlinMethod(method)
        : generateSyncKotlinMethod(method)
    )
    .join('\n\n');

  return `package ${kotlinPackageName}

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod${
    hasAsyncMethod ? '\nimport com.facebook.react.bridge.Promise' : ''
  }${hasObjectType ? '\nimport com.facebook.react.bridge.ReadableMap' : ''}

class NativeBrownfieldNavigationModule(
  reactContext: ReactApplicationContext
) : NativeBrownfieldNavigationSpec(reactContext) {
${methodImplementations}

  companion object {
    const val NAME = "NativeBrownfieldNavigation"
  }
}
`;
}

function generateSyncKotlinMethod(method: MethodSignature): string {
  const params = method.params
    .map((param) => `${param.name}: ${mapTsTypeToKotlin(param.type, param.optional)}`)
    .join(', ');
  const args = method.params.map((param) => param.name).join(', ');

  const signature = `  @ReactMethod\n  override fun ${method.name}(${params})${
    method.returnType === 'void'
      ? ''
      : `: ${mapTsTypeToKotlin(method.returnType, false)}`
  }`;

  if (method.returnType === 'void') {
    return `${signature} {
    BrownfieldNavigationManager.getDelegate().${method.name}(${args})
  }`;
  }

  return `${signature} {
    return BrownfieldNavigationManager.getDelegate().${method.name}(${args})
  }`;
}

function generateAsyncKotlinMethod(method: MethodSignature): string {
  const paramsWithTypes = method.params
    .map((param) => `${param.name}: ${mapTsTypeToKotlin(param.type, param.optional)}`)
    .join(', ');
  const params =
    paramsWithTypes.length > 0
      ? `${paramsWithTypes}, promise: Promise`
      : 'promise: Promise';

  return `  @ReactMethod
  override fun ${method.name}(${params}) {
    promise.reject("not_implemented", "${method.name} is not implemented")
  }`;
}
