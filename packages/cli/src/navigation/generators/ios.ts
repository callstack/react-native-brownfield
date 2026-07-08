import type { MethodParam, MethodSignature } from '../types.js';

const TS_TO_OBJC_TYPE: Record<string, string> = {
  string: 'NSString *',
  number: 'double',
  boolean: 'BOOL',
  void: 'void',
  Object: 'NSDictionary *',
};

const TS_TO_SWIFT_TYPE: Record<string, string> = {
  string: 'String',
  number: 'Double',
  boolean: 'Bool',
  void: 'Void',
  Object: '[String: Any]',
};

interface ObjCTypeMappingOptions {
  modelTypeNames?: string[];
}

function hasCallbackParam(methods: MethodSignature[]): boolean {
  return methods.some((method) => method.params.some((param) => param.callback));
}

function mapTsTypeToObjC(
  tsType: string,
  nullable: boolean = false,
  options: ObjCTypeMappingOptions = {}
): string {
  if (tsType.startsWith('Promise<')) {
    return 'void';
  }

  if (options.modelTypeNames?.includes(tsType)) {
    return nullable ? 'NSDictionary * _Nullable' : 'NSDictionary *';
  }

  const mapped = TS_TO_OBJC_TYPE[tsType];
  if (mapped) {
    if (nullable && mapped.includes('*')) {
      return mapped.replace(' *', ' * _Nullable');
    }
    return mapped;
  }

  return nullable ? 'id _Nullable' : 'id';
}

function mapParamToObjC(
  param: MethodParam,
  nullable: boolean = false,
  options: ObjCTypeMappingOptions = {}
): string {
  if (param.callback) {
    return param.optional
      ? 'RCTResponseSenderBlock _Nullable'
      : 'RCTResponseSenderBlock';
  }
  return mapTsTypeToObjC(param.type, nullable, options);
}

interface SwiftTypeMappingOptions {
  modelTypeNames?: string[];
}

interface ObjCGenerationOptions extends ObjCTypeMappingOptions {}

function mapTsTypeToSwift(
  tsType: string,
  optional: boolean = false,
  options: SwiftTypeMappingOptions = {}
): string {
  if (tsType.startsWith('Promise<')) {
    const inner = tsType.slice(8, -1);
    return mapTsTypeToSwift(inner, optional, options);
  }

  const mapped = TS_TO_SWIFT_TYPE[tsType];
  if (mapped) {
    return optional ? `${mapped}?` : mapped;
  }

  if (options.modelTypeNames?.includes(tsType)) {
    return optional ? `${tsType}?` : tsType;
  }

  return optional ? 'Any?' : 'Any';
}

function mapParamToSwift(
  param: MethodParam,
  options: SwiftTypeMappingOptions = {}
): string {
  if (param.callback) {
    return param.optional
      ? '@escaping RCTResponseSenderBlock?'
      : '@escaping RCTResponseSenderBlock';
  }
  return mapTsTypeToSwift(param.type, param.optional, options);
}

export function generateSwiftDelegate(
  methods: MethodSignature[],
  options: SwiftTypeMappingOptions = {}
): string {
  const needsReactImport =
    methods.some((method) => method.isAsync) || hasCallbackParam(methods);
  const protocolMethods = methods
    .map((method) => {
      const methodParams = method.params.map((param, index) => {
        const swiftType = mapParamToSwift(param, options);
        const label = index === 0 ? '_' : param.name;
        return `${label} ${param.name}: ${swiftType}`;
      });
      const promiseParams = method.isAsync
        ? [
            `${methodParams.length === 0 ? '_ resolve' : 'resolve'}: @escaping RCTPromiseResolveBlock`,
            'reject: @escaping RCTPromiseRejectBlock',
          ]
        : [];
      const params = [...methodParams, ...promiseParams].join(', ');

      const returnType =
        method.returnType === 'void' || method.isAsync
          ? ''
          : ` -> ${mapTsTypeToSwift(method.returnType, false, options)}`;

      return `    @objc func ${method.name}(${params})${returnType}`;
    })
    .join('\n');

  return `import Foundation${needsReactImport ? '\nimport React' : ''}

@objc public protocol BrownfieldNavigationDelegate: AnyObject {
${protocolMethods}
}
`;
}

export function generateObjCImplementation(
  methods: MethodSignature[],
  options: ObjCGenerationOptions = {}
): string {
  const methodImplementations = methods
    .map((method) =>
      method.isAsync
        ? generateAsyncObjCMethod(method, options)
        : generateSyncObjCMethod(method, options)
    )
    .join('\n\n');

  return `#import "NativeBrownfieldNavigation.h"

#if __has_include("BrownfieldNavigation/BrownfieldNavigation-Swift.h")
#import "BrownfieldNavigation/BrownfieldNavigation-Swift.h"
#else
#import "BrownfieldNavigation-Swift.h"
#endif

@implementation NativeBrownfieldNavigation

${methodImplementations}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeBrownfieldNavigationSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"NativeBrownfieldNavigation";
}

@end
`;
}

function prepareObjCArgs(
  method: MethodSignature,
  options: ObjCGenerationOptions
): { preparedParams: string[]; delegateArgs: string[] } {
  const preparedParams: string[] = [];
  const delegateArgs: string[] = [];
  for (const param of method.params) {
    if (options.modelTypeNames?.includes(param.type)) {
      const convertedParamName = `${param.name}Model`;
      preparedParams.push(
        `${param.type} *${convertedParamName} = ${param.name} == nil ? nil : [${param.type} fromDictionary:${param.name}];`
      );
      delegateArgs.push(convertedParamName);
    } else {
      delegateArgs.push(param.name);
    }
  }
  return { preparedParams, delegateArgs };
}

function buildObjCDelegateCall(
  name: string,
  params: Array<{ name: string; type: string; optional: boolean }>,
  delegateArgs: string[]
): string {
  let delegateCall = `[[[BrownfieldNavigationManager shared] getDelegate] ${name}`;
  if (delegateArgs.length > 0) {
    delegateCall += delegateArgs
      .map((argName, index) => {
        const param = params[index];
        const label = index === 0 ? '' : param.name;
        return `${label}:${argName}`;
      })
      .join(' ');
  }
  delegateCall += ']';
  return delegateCall;
}

function generateSyncObjCMethod(
  method: MethodSignature,
  options: ObjCGenerationOptions
): string {
  const { name, params, returnType } = method;

  let signature = `- (${mapTsTypeToObjC(returnType, false, options)})${name}`;
  if (params.length > 0) {
    signature += params
      .map((param, index) => {
        const prefix = index === 0 ? ':' : ` ${param.name}:`;
        return `${prefix}(${mapParamToObjC(param, param.optional, options)})${param.name}`;
      })
      .join('');
  }

  const { preparedParams, delegateArgs } = prepareObjCArgs(method, options);
  const delegateCall = buildObjCDelegateCall(name, params, delegateArgs);

  const returnPrefix = returnType === 'void' ? '' : 'return ';
  const preparedLines = preparedParams.map((line) => `    ${line}`).join('\n');
  const bodyPrefix = preparedLines.length > 0 ? `${preparedLines}\n` : '';

  return `${signature} {
${bodyPrefix}    ${returnPrefix}${delegateCall};
}`;
}

function generateAsyncObjCMethod(
  method: MethodSignature,
  options: ObjCGenerationOptions
): string {
  const { name, params } = method;

  let signature = `- (void)${name}`;
  const promiseParams: Array<{ name: string; type: string; optional: boolean }> = [
    { name: 'resolve', type: 'RCTPromiseResolveBlock', optional: false },
    { name: 'reject', type: 'RCTPromiseRejectBlock', optional: false },
  ];
  const allParams = [...params, ...promiseParams];

  signature += ':';
  signature += allParams
    .map((param, index) => {
      const prefix = index === 0 ? '' : `${param.name}:`;
      const type =
        param.type === 'RCTPromiseResolveBlock'
          ? 'RCTPromiseResolveBlock'
          : param.type === 'RCTPromiseRejectBlock'
            ? 'RCTPromiseRejectBlock'
            : mapParamToObjC(param, param.optional, options);
      return `${prefix}(${type})${param.name}`;
    })
    .join(' ');

  const { preparedParams, delegateArgs } = prepareObjCArgs(method, options);
  const asyncDelegateArgs = [...delegateArgs, 'resolve', 'reject'];
  const delegateCall = buildObjCDelegateCall(name, allParams, asyncDelegateArgs);
  const preparedLines = preparedParams.map((line) => `    ${line}`).join('\n');
  const bodyPrefix = preparedLines.length > 0 ? `${preparedLines}\n` : '';

  return `${signature} {
${bodyPrefix}    ${delegateCall};
}`;
}
