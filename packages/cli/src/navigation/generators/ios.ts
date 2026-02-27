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

function mapTsTypeToObjC(tsType: string, nullable: boolean = false): string {
  if (tsType.startsWith('Promise<')) {
    return 'void';
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

function mapTsTypeToSwift(tsType: string, optional: boolean = false): string {
  if (tsType.startsWith('Promise<')) {
    const inner = tsType.slice(8, -1);
    return mapTsTypeToSwift(inner, optional);
  }

  const mapped = TS_TO_SWIFT_TYPE[tsType];
  if (mapped) {
    return optional ? `${mapped}?` : mapped;
  }

  return optional ? 'Any?' : 'Any';
}

export function generateSwiftDelegate(methods: MethodSignature[]): string {
  const protocolMethods = methods
    .map((method) => {
      const params = method.params
        .map((param) => {
          const swiftType = mapTsTypeToSwift(param.type, param.optional);
          return `${param.name}: ${swiftType}`;
        })
        .join(', ');

      const returnType =
        method.returnType === 'void'
          ? ''
          : ` -> ${mapTsTypeToSwift(method.returnType, false)}`;

      return `    @objc func ${method.name}(${params})${returnType}`;
    })
    .join('\n');

  return `import Foundation

@objc public protocol BrownfieldNavigationDelegate: AnyObject {
${protocolMethods}
}
`;
}

export function generateObjCImplementation(methods: MethodSignature[]): string {
  const methodImplementations = methods
    .map((method) =>
      method.isAsync ? generateAsyncObjCMethod(method) : generateSyncObjCMethod(method)
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

function generateSyncObjCMethod(method: MethodSignature): string {
  const { name, params, returnType } = method;

  let signature = `- (${mapTsTypeToObjC(returnType)})${name}`;
  if (params.length > 0) {
    signature += params
      .map((param, index) => {
        const prefix = index === 0 ? ':' : ` ${param.name}:`;
        return `${prefix}(${mapTsTypeToObjC(param.type, param.optional)})${param.name}`;
      })
      .join('');
  }

  let delegateCall = `[[[BrownfieldNavigationManager shared] getDelegate] ${name}`;
  if (params.length > 0) {
    delegateCall += params
      .map((param, index) => {
        const label =
          index === 0 ? `With${capitalizeFirst(param.name)}` : param.name;
        return `${label}:${param.name}`;
      })
      .join(' ');
  }
  delegateCall += ']';

  const returnPrefix = returnType === 'void' ? '' : 'return ';

  return `${signature} {
    ${returnPrefix}${delegateCall};
}`;
}

function generateAsyncObjCMethod(method: MethodSignature): string {
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
            : mapTsTypeToObjC(param.type, param.optional);
      return `${prefix}(${type})${param.name}`;
    })
    .join(' ');

  return `${signature} {
    reject(@"not_implemented", @"${name} is not implemented", nil);
}`;
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
