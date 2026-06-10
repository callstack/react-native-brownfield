import type { MethodSignature } from '../types.js';

const TS_TO_KOTLIN_TYPE: Record<string, string> = {
  string: 'String',
  number: 'Double',
  boolean: 'Boolean',
  void: 'Unit',
  Object: 'ReadableMap',
};

interface KotlinTypeMappingOptions {
  modelTypeNames?: string[];
}

function mapTsTypeToKotlin(
  tsType: string,
  optional: boolean = false,
  options: KotlinTypeMappingOptions = {},
  layer: 'delegate' | 'module' = 'delegate'
): string {
  if (tsType.startsWith('Promise<')) {
    const inner = tsType.slice(8, -1);
    return mapTsTypeToKotlin(inner, optional, options, layer);
  }

  const mapped = TS_TO_KOTLIN_TYPE[tsType];
  if (mapped) {
    return optional ? `${mapped}?` : mapped;
  }

  if (options.modelTypeNames?.includes(tsType)) {
    if (layer === 'module') {
      return optional ? 'ReadableMap?' : 'ReadableMap';
    }
    return optional ? `${tsType}?` : tsType;
  }

  return optional ? 'Any?' : 'Any';
}

export function generateKotlinDelegate(
  methods: MethodSignature[],
  kotlinPackageName: string,
  options: KotlinTypeMappingOptions = {}
): string {
  const methodSignatures = methods
    .map((method) => {
      const params = method.params
        .map(
          (param) =>
            `${param.name}: ${mapTsTypeToKotlin(param.type, param.optional, options)}`
        )
        .join(', ');
      const returnType =
        method.returnType === 'void'
          ? ''
          : `: ${mapTsTypeToKotlin(method.returnType, false, options, 'delegate')}`;
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
  kotlinPackageName: string,
  options: KotlinTypeMappingOptions = {}
): string {
  const hasAsyncMethod = methods.some((method) => method.isAsync);
  const hasObjectType = methods.some(
    (method) =>
      method.returnType.includes('Object') ||
      method.params.some(
        (param) =>
          param.type === 'Object' || options.modelTypeNames?.includes(param.type)
      )
  );

  const methodImplementations = methods
    .map((method) =>
      method.isAsync
        ? generateAsyncKotlinMethod(method, options)
        : generateSyncKotlinMethod(method, options)
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

function generateSyncKotlinMethod(
  method: MethodSignature,
  options: KotlinTypeMappingOptions = {}
): string {
  const params = method.params
    .map(
      (param) =>
        `${param.name}: ${mapTsTypeToKotlin(param.type, param.optional, options, 'module')}`
    )
    .join(', ');
  const preparedParams: string[] = [];
  const args = method.params
    .map((param) => {
      if (options.modelTypeNames?.includes(param.type)) {
        const convertedName = `${param.name}Model`;
        preparedParams.push(
          `    val ${convertedName} = ${param.name}${
            param.optional
              ? `?.let(::to${param.type})`
              : `.let(::to${param.type})`
          }`
        );
        return convertedName;
      }
      return param.name;
    })
    .join(', ');

  const signature = `  @ReactMethod\n  override fun ${method.name}(${params})${
    method.returnType === 'void'
      ? ''
      : `: ${mapTsTypeToKotlin(method.returnType, false, options, 'module')}`
  }`;
  const preparedPrefix = preparedParams.length > 0 ? `${preparedParams.join('\n')}\n` : '';

  if (method.returnType === 'void') {
    return `${signature} {
${preparedPrefix}    BrownfieldNavigationManager.getDelegate().${method.name}(${args})
  }`;
  }

  return `${signature} {
${preparedPrefix}    return BrownfieldNavigationManager.getDelegate().${method.name}(${args})
  }`;
}

function generateAsyncKotlinMethod(
  method: MethodSignature,
  options: KotlinTypeMappingOptions = {}
): string {
  const paramsWithTypes = method.params
    .map(
      (param) =>
        `${param.name}: ${mapTsTypeToKotlin(param.type, param.optional, options, 'module')}`
    )
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
