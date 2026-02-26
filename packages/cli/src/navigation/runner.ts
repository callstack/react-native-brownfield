import fs from 'node:fs';
import path from 'node:path';

import { logger } from '@rock-js/tools';
import {
  DEFAULT_ANDROID_JAVA_PACKAGE,
  getNavigationPackagePath,
} from './config.js';
import { parseNavigationSpec } from './parser.js';
import { resolveNavigationSpecPath } from './spec-discovery.js';
import {
  generateIndexDts,
  generateIndexTs,
  generateTurboModuleSpec,
  transpileWithConsumerBabel,
} from './generators/ts.js';
import {
  generateObjCImplementation,
  generateSwiftDelegate,
} from './generators/ios.js';
import {
  generateKotlinDelegate,
  generateKotlinModule,
} from './generators/android.js';
import type { GeneratedNavigationArtifacts } from './types.js';

interface RunNavigationCodegenOptions {
  specPath?: string;
  dryRun?: boolean;
  projectRoot?: string;
}

interface NavigationOutputPaths {
  turboModuleSpec: string;
  navigationTs: string;
  commonjsIndexJs: string;
  moduleIndexJs: string;
  commonjsIndexDts: string;
  moduleIndexDts: string;
  swiftDelegate: string;
  objcImplementation: string;
  kotlinDelegate: string;
  kotlinModule: string;
}

function getOutputPaths(
  packageRoot: string,
  androidJavaPackageName: string
): NavigationOutputPaths {
  const androidPackagePathSegments = androidJavaPackageName.split('.');

  return {
    turboModuleSpec: path.join(packageRoot, 'src', 'NativeBrownfieldNavigation.ts'),
    navigationTs: path.join(packageRoot, 'src', 'index.ts'),
    commonjsIndexJs: path.join(packageRoot, 'lib', 'commonjs', 'index.js'),
    moduleIndexJs: path.join(packageRoot, 'lib', 'module', 'index.js'),
    commonjsIndexDts: path.join(
      packageRoot,
      'lib',
      'typescript',
      'commonjs',
      'src',
      'index.d.ts'
    ),
    moduleIndexDts: path.join(
      packageRoot,
      'lib',
      'typescript',
      'module',
      'src',
      'index.d.ts'
    ),
    swiftDelegate: path.join(
      packageRoot,
      'ios',
      'BrownfieldNavigationDelegate.swift'
    ),
    objcImplementation: path.join(
      packageRoot,
      'ios',
      'NativeBrownfieldNavigation.mm'
    ),
    kotlinDelegate: path.join(
      packageRoot,
      'android',
      'src',
      'main',
      'java',
      ...androidPackagePathSegments,
      'BrownfieldNavigationDelegate.kt'
    ),
    kotlinModule: path.join(
      packageRoot,
      'android',
      'src',
      'main',
      'java',
      ...androidPackagePathSegments,
      'NativeBrownfieldNavigationModule.kt'
    ),
  };
}

function writeArtifacts(
  paths: NavigationOutputPaths,
  artifacts: GeneratedNavigationArtifacts
): void {
  fs.writeFileSync(paths.turboModuleSpec, artifacts.turboModuleSpec);
  logger.success(`Generated ${paths.turboModuleSpec}`);

  fs.writeFileSync(paths.navigationTs, artifacts.indexTs);
  logger.success(`Generated ${paths.navigationTs}`);

  fs.writeFileSync(paths.commonjsIndexJs, artifacts.indexJs);
  logger.success(`Generated ${paths.commonjsIndexJs}`);

  fs.writeFileSync(paths.moduleIndexJs, artifacts.indexJs);
  logger.success(`Generated ${paths.moduleIndexJs}`);

  fs.writeFileSync(paths.commonjsIndexDts, artifacts.indexDts);
  logger.success(`Generated ${paths.commonjsIndexDts}`);

  fs.writeFileSync(paths.moduleIndexDts, artifacts.indexDts);
  logger.success(`Generated ${paths.moduleIndexDts}`);

  fs.writeFileSync(paths.swiftDelegate, artifacts.swiftDelegate);
  logger.success(`Generated ${paths.swiftDelegate}`);

  fs.writeFileSync(paths.objcImplementation, artifacts.objcImplementation);
  logger.success(`Generated ${paths.objcImplementation}`);

  fs.writeFileSync(paths.kotlinDelegate, artifacts.kotlinDelegate);
  logger.success(`Generated ${paths.kotlinDelegate}`);

  fs.writeFileSync(paths.kotlinModule, artifacts.kotlinModule);
  logger.success(`Generated ${paths.kotlinModule}`);
}

function printDryRun(
  androidJavaPackageName: string,
  artifacts: GeneratedNavigationArtifacts
): void {
  logger.info('\n--- Generated: src/NativeBrownfieldNavigation.ts ---\n');
  logger.log(artifacts.turboModuleSpec);
  logger.info('\n--- Generated: src/index.ts ---\n');
  logger.log(artifacts.indexTs);
  logger.info('\n--- Generated (Babel): lib/{commonjs,module}/index.js ---\n');
  logger.log(artifacts.indexJs);
  logger.info(
    '\n--- Generated: lib/typescript/{commonjs,module}/src/index.d.ts ---\n'
  );
  logger.log(artifacts.indexDts);
  logger.info('\n--- Generated: ios/BrownfieldNavigationDelegate.swift ---\n');
  logger.log(artifacts.swiftDelegate);
  logger.info('\n--- Generated: ios/NativeBrownfieldNavigation.mm ---\n');
  logger.log(artifacts.objcImplementation);
  logger.info(
    `\n--- Generated: android/src/main/java/${androidJavaPackageName.replaceAll('.', '/')}/BrownfieldNavigationDelegate.kt ---\n`
  );
  logger.log(artifacts.kotlinDelegate);
  logger.info(
    `\n--- Generated: android/src/main/java/${androidJavaPackageName.replaceAll('.', '/')}/NativeBrownfieldNavigationModule.kt ---\n`
  );
  logger.log(artifacts.kotlinModule);
}

export function runNavigationCodegen({
  specPath,
  dryRun = false,
  projectRoot = process.cwd(),
}: RunNavigationCodegenOptions): void {
  const resolvedSpecPath = resolveNavigationSpecPath(specPath, projectRoot);
  if (!fs.existsSync(resolvedSpecPath)) {
    throw new Error(`Spec file not found: ${resolvedSpecPath}`);
  }

  logger.info(`Parsing spec file: ${resolvedSpecPath}`);
  const methods = parseNavigationSpec(resolvedSpecPath);
  if (methods.length === 0) {
    throw new Error('No methods found in spec file');
  }

  logger.info(
    `Found ${methods.length} method(s): ${methods.map((method) => method.name).join(', ')}`
  );

  const packageRoot = getNavigationPackagePath(projectRoot);
  const androidJavaPackageName = DEFAULT_ANDROID_JAVA_PACKAGE;
  const indexTs = generateIndexTs(methods);

  const artifacts: GeneratedNavigationArtifacts = {
    turboModuleSpec: generateTurboModuleSpec(methods),
    indexTs,
    indexJs: transpileWithConsumerBabel(indexTs, projectRoot, packageRoot),
    indexDts: generateIndexDts(methods),
    swiftDelegate: generateSwiftDelegate(methods),
    objcImplementation: generateObjCImplementation(methods),
    kotlinDelegate: generateKotlinDelegate(methods, androidJavaPackageName),
    kotlinModule: generateKotlinModule(methods, androidJavaPackageName),
  };

  if (dryRun) {
    printDryRun(androidJavaPackageName, artifacts);
    return;
  }

  writeArtifacts(getOutputPaths(packageRoot, androidJavaPackageName), artifacts);
}
