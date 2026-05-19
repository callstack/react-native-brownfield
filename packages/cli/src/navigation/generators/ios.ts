import type { MethodSignature } from '../types.js';

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

export function generateSwiftDelegate(
  methods: MethodSignature[],
  options: SwiftTypeMappingOptions = {}
): string {
  const protocolMethods = methods
    .map((method) => {
      const params = method.params
        .map((param, index) => {
          const swiftType = mapTsTypeToSwift(param.type, param.optional, options);
          const label = index === 0 ? '_' : param.name;
          return `${label} ${param.name}: ${swiftType}`;
        })
        .join(', ');

      const returnType =
        method.returnType === 'void'
          ? ''
          : ` -> ${mapTsTypeToSwift(method.returnType, false, options)}`;

      return `    @objc func ${method.name}(${params})${returnType}`;
    })
    .join('\n');

  return `import Foundation

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
        return `${prefix}(${mapTsTypeToObjC(param.type, param.optional, options)})${param.name}`;
      })
      .join('');
  }

  const preparedParams: string[] = [];
  const delegateArgs: string[] = [];
  for (const param of params) {
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
  const allParams: Array<{ name: string; type: string; optional: boolean }> = [
    ...params,
    { name: 'resolve', type: 'RCTPromiseResolveBlock', optional: false },
    { name: 'reject', type: 'RCTPromiseRejectBlock', optional: false },
  ];

  signature += ':';
  signature += allParams
    .map((param, index) => {
      const prefix = index === 0 ? '' : param.name;
      const type =
        param.type === 'RCTPromiseResolveBlock'
          ? 'RCTPromiseResolveBlock'
          : param.type === 'RCTPromiseRejectBlock'
            ? 'RCTPromiseRejectBlock'
            : mapTsTypeToObjC(param.type, param.optional, options);
      return `${prefix}(${type})${param.name}`;
    })
    .join(' ');

  return `${signature} {
    reject(@"not_implemented", @"${name} is not implemented", nil);
}`;
}
