#!/usr/bin/env node
/**
 * Brownfield Navigation Codegen Script
 *
 * Reads a user's brownfield.navigation.ts spec file and generates/updates:
 * - src/NativeBrownfieldNavigation.ts (TurboModule spec)
 * - ios/NativeBrownfieldNavigation.mm (Objective-C++ implementation)
 * - ios/BrownfieldNavigationDelegate.swift (Swift delegate protocol)
 * - src/index.tsx (Exported JavaScript API)
 *
 * Usage:
 *   npx brownfield-navigation-codegen <path-to-brownfield.navigation.ts>
 *
 * Example user spec (brownfield.navigation.ts):
 *   export interface BrownfieldNavigationSpec {
 *     navigateToProfile(userId: string): void;
 *     navigateToSettings(): void;
 *   }
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Resolve script directory in both CJS and ESM runtimes.
// `process.argv[1]` is the executed CLI script path.
const scriptFile = process.argv[1]
  ? fs.realpathSync(process.argv[1])
  : path.join(process.cwd(), 'brownfield-navigation.js');
const scriptDir = path.dirname(scriptFile);

// Package root is one level up from scripts/
const PACKAGE_ROOT = path.resolve(scriptDir, '../../../');

// ============================================================================
// Types
// ============================================================================

interface MethodParam {
  name: string;
  type: string;
  optional: boolean;
}

interface MethodSignature {
  name: string;
  params: MethodParam[];
  returnType: string;
  isAsync: boolean;
}

// ============================================================================
// TypeScript to Native Type Mapping
// ============================================================================

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

// ============================================================================
// Spec Parser
// ============================================================================

function parseUserSpec(filePath: string): MethodSignature[] {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract interface body - supports both BrownfieldNavigationSpec and Spec
  const interfaceMatch = content.match(
    /export interface (?:BrownfieldNavigationSpec|Spec)\s*\{([^}]+)\}/s
  );
  if (!interfaceMatch || !interfaceMatch[1]) {
    throw new Error(
      'Could not find BrownfieldNavigationSpec or Spec interface in spec file'
    );
  }
  const interfaceBody = interfaceMatch[1];

  // Parse methods
  const methods: MethodSignature[] = [];
  const methodRegex = /(\w+)\s*\(([^)]*)\)\s*:\s*(Promise<[^>]+>|[^;]+)\s*;/g;

  let match;
  while ((match = methodRegex.exec(interfaceBody)) !== null) {
    const name = match[1];
    const paramsStr = match[2];
    const returnType = match[3];

    if (!name || !returnType) {
      continue;
    }

    const params: MethodParam[] = [];
    if (paramsStr && paramsStr.trim()) {
      const paramParts = paramsStr.split(',');
      for (const param of paramParts) {
        const paramMatch = param.trim().match(/(\w+)(\?)?:\s*(.+)/);
        if (paramMatch && paramMatch[1] && paramMatch[3]) {
          params.push({
            name: paramMatch[1],
            type: paramMatch[3].trim(),
            optional: !!paramMatch[2],
          });
        }
      }
    }

    methods.push({
      name,
      params,
      returnType: returnType.trim(),
      isAsync: returnType.trim().startsWith('Promise<'),
    });
  }

  return methods;
}

// ============================================================================
// Code Generators
// ============================================================================

function generateTurboModuleSpec(methods: MethodSignature[]): string {
  const methodSignatures = methods
    .map((m) => {
      const params = m.params
        .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
        .join(', ');
      return `  ${m.name}(${params}): ${m.returnType};`;
    })
    .join('\n');

  return `import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
${methodSignatures}
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'NativeBrownfieldNavigation'
);
`;
}

function generateBrownfieldNavigationTS(methods: MethodSignature[]): string {
  const functionImplementations = methods
    .map((m) => {
      const params = m.params
        .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
        .join(', ');
      const args = m.params.map((p) => p.name).join(', ');
      const returnType = m.returnType === 'void' ? '' : `: ${m.returnType}`;

      if (m.isAsync) {
        return `  ${m.name}: async (${params})${returnType} => {
    return NativeBrownfieldNavigation.${m.name}(${args});
  }`;
      }
      return `  ${m.name}: (${params})${returnType} => {
    NativeBrownfieldNavigation.${m.name}(${args});
  }`;
    })
    .join(',\n');

  return `import NativeBrownfieldNavigation from './NativeBrownfieldNavigation';

const BrownfieldNavigation = {
${functionImplementations},
};

export default BrownfieldNavigation;
`;
}

function generateSwiftDelegate(methods: MethodSignature[]): string {
  const protocolMethods = methods
    .map((m) => {
      const params = m.params
        .map((p) => {
          const swiftType = mapTsTypeToSwift(p.type, p.optional);
          return `${p.name}: ${swiftType}`;
        })
        .join(', ');

      const returnType =
        m.returnType === 'void'
          ? ''
          : ` -> ${mapTsTypeToSwift(m.returnType, false)}`;

      return `    @objc func ${m.name}(${params})${returnType}`;
    })
    .join('\n');

  return `import Foundation

@objc public protocol BrownfieldNavigationDelegate: AnyObject {
${protocolMethods}
}
`;
}

function generateObjCImplementation(methods: MethodSignature[]): string {
  const methodImpls = methods
    .map((m) => {
      if (m.isAsync) {
        return generateAsyncObjCMethod(m);
      }
      return generateSyncObjCMethod(m);
    })
    .join('\n\n');

  return `#import "NativeBrownfieldNavigation.h"

#if __has_include("ReactBrownfield/ReactBrownfield-Swift.h")
#import "ReactBrownfield/ReactBrownfield-Swift.h"
#else
#import "ReactBrownfield-Swift.h"
#endif

@implementation NativeBrownfieldNavigation

${methodImpls}

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

  // Build ObjC method signature
  let signature = `- (${mapTsTypeToObjC(returnType)})${name}`;
  if (params.length > 0) {
    signature += params
      .map((p, i) => {
        const prefix = i === 0 ? ':' : ` ${p.name}:`;
        return `${prefix}(${mapTsTypeToObjC(p.type, p.optional)})${p.name}`;
      })
      .join('');
  }

  // Build delegate call with Swift-style labels
  let delegateCall = `[[[BrownfieldNavigationManager shared] getDelegate] ${name}`;
  if (params.length > 0) {
    delegateCall += params
      .map((p, i) => {
        // First param: use "With" prefix for Swift interop
        const label = i === 0 ? 'With' + capitalizeFirst(p.name) : p.name;
        return `${label}:${p.name}`;
      })
      .join(' ');
  }
  delegateCall += ']';

  const returnStatement = returnType === 'void' ? '' : 'return ';

  return `${signature} {
    ${returnStatement}${delegateCall};
}`;
}

function generateAsyncObjCMethod(method: MethodSignature): string {
  const { name, params } = method;

  // Build ObjC method signature with resolve/reject blocks
  let signature = `- (void)${name}`;
  const allParams: Array<{ name: string; type: string; optional: boolean }> = [
    ...params,
    { name: 'resolve', type: 'RCTPromiseResolveBlock', optional: false },
    { name: 'reject', type: 'RCTPromiseRejectBlock', optional: false },
  ];

  signature += ':';
  signature += allParams
    .map((p, i) => {
      const prefix = i === 0 ? '' : p.name;
      const type =
        p.type === 'RCTPromiseResolveBlock'
          ? 'RCTPromiseResolveBlock'
          : p.type === 'RCTPromiseRejectBlock'
            ? 'RCTPromiseRejectBlock'
            : mapTsTypeToObjC(p.type, p.optional);
      return `${prefix}(${type})${p.name}`;
    })
    .join(' ');

  return `${signature} {
    // TODO: Implement async call to delegate
    reject(@"not_implemented", @"${name} is not implemented", nil);
}`;
}

// ============================================================================
// Utilities
// ============================================================================

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Brownfield Navigation Codegen');
    console.log('');
    console.log('Usage:');
    console.log(
      '  npx brownfield-navigation-codegen <path-to-brownfield.navigation.ts>'
    );
    console.log('');
    console.log('Options:');
    console.log('  --dry-run    Print generated code without writing files');
    console.log('');
    console.log('Example user spec (brownfield.navigation.ts):');
    console.log('  export interface BrownfieldNavigationSpec {');
    console.log('    navigateToProfile(userId: string): void;');
    console.log('    navigateToSettings(): void;');
    console.log('  }');
    process.exit(1);
  }

  const specFile = args[0];
  if (!specFile) {
    console.error('Error: No spec file provided');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');

  // Resolve spec file path
  const specPath = path.isAbsolute(specFile)
    ? specFile
    : path.resolve(process.cwd(), specFile);

  if (!fs.existsSync(specPath)) {
    console.error(`Error: Spec file not found: ${specPath}`);
    process.exit(1);
  }

  console.log(`Parsing spec file: ${specPath}`);
  const methods = parseUserSpec(specPath);

  if (methods.length === 0) {
    console.error('Error: No methods found in spec file');
    process.exit(1);
  }

  console.log(
    `Found ${methods.length} method(s): ${methods
      .map((m) => m.name)
      .join(', ')}`
  );

  // Generate all files
  const turboModuleSpec = generateTurboModuleSpec(methods);
  const brownfieldNavigationTS = generateBrownfieldNavigationTS(methods);
  const swiftDelegate = generateSwiftDelegate(methods);
  const objcImpl = generateObjCImplementation(methods);

  if (dryRun) {
    console.log('\n--- Generated: src/NativeBrownfieldNavigation.ts ---');
    console.log(turboModuleSpec);
    console.log('\n--- Generated: src/BrownfieldNavigation.ts ---');
    console.log(brownfieldNavigationTS);
    console.log('\n--- Generated: ios/BrownfieldNavigationDelegate.swift ---');
    console.log(swiftDelegate);
    console.log('\n--- Generated: ios/NativeBrownfieldNavigation.mm ---');
    console.log(objcImpl);
    return;
  }

  // Write files to package
  const paths = {
    turboModuleSpec: path.join(
      PACKAGE_ROOT,
      'src',
      'NativeBrownfieldNavigation.ts'
    ),
    navigationTs: path.join(PACKAGE_ROOT, 'src', 'BrownfieldNavigation.ts'),
    swiftDelegate: path.join(
      PACKAGE_ROOT,
      'ios',
      'BrownfieldNavigation',
      'BrownfieldNavigationDelegate.swift'
    ),
    objcImpl: path.join(
      PACKAGE_ROOT,
      'ios',
      'BrownfieldNavigation',
      'NativeBrownfieldNavigation.mm'
    ),
  };

  fs.writeFileSync(paths.turboModuleSpec, turboModuleSpec);
  console.log(`\nGenerated: ${paths.turboModuleSpec}`);

  fs.writeFileSync(paths.navigationTs, brownfieldNavigationTS);
  console.log(`Generated: ${paths.navigationTs}`);

  fs.writeFileSync(paths.swiftDelegate, swiftDelegate);
  console.log(`Generated: ${paths.swiftDelegate}`);

  fs.writeFileSync(paths.objcImpl, objcImpl);
  console.log(`Generated: ${paths.objcImpl}`);

  console.log('\nCodegen complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run pod install in your iOS project');
  console.log(
    '2. Implement the BrownfieldNavigationDelegate protocol in your native code'
  );
  console.log(
    '3. Call BrownfieldNavigationManager.shared.setDelegate(yourDelegate) before using the module'
  );
}

main();
