import fs from 'node:fs';
import path from 'node:path';

import { intro, logger, outro } from '@rock-js/tools';
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
import { generateNavigationModels } from './generators/models.js';
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
  swiftModels: string;
  objcImplementation: string;
  kotlinDelegate: string;
  kotlinModule: string;
  kotlinModels: string;
}

function getOutputPaths(
  packageRoot: string,
  androidJavaPackageName: string
): NavigationOutputPaths {
  const androidPackagePathSegments = androidJavaPackageName.split('.');

  return {
    turboModuleSpec: path.join(
      packageRoot,
      'src',
      'NativeBrownfieldNavigation.ts'
    ),
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
    swiftModels: path.join(
      packageRoot,
      'ios',
      'BrownfieldNavigationModels.swift'
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
    kotlinModels: path.join(
      packageRoot,
      'android',
      'src',
      'main',
      'java',
      ...androidPackagePathSegments,
      'BrownfieldNavigationModels.kt'
    ),
  };
}

function writeFileEnsuringDir(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeArtifacts(
  paths: NavigationOutputPaths,
  artifacts: GeneratedNavigationArtifacts
): void {
  writeFileEnsuringDir(paths.turboModuleSpec, artifacts.turboModuleSpec);
  logger.success(`Generated ${paths.turboModuleSpec}`);

  writeFileEnsuringDir(paths.navigationTs, artifacts.indexTs);
  logger.success(`Generated ${paths.navigationTs}`);

  writeFileEnsuringDir(paths.commonjsIndexJs, artifacts.indexJs);
  logger.success(`Generated ${paths.commonjsIndexJs}`);

  writeFileEnsuringDir(paths.moduleIndexJs, artifacts.indexJs);
  logger.success(`Generated ${paths.moduleIndexJs}`);

  writeFileEnsuringDir(paths.commonjsIndexDts, artifacts.indexDts);
  logger.success(`Generated ${paths.commonjsIndexDts}`);

  writeFileEnsuringDir(paths.moduleIndexDts, artifacts.indexDts);
  logger.success(`Generated ${paths.moduleIndexDts}`);

  writeFileEnsuringDir(paths.swiftDelegate, artifacts.swiftDelegate);
  logger.success(`Generated ${paths.swiftDelegate}`);

  if (artifacts.swiftModels) {
    writeFileEnsuringDir(paths.swiftModels, artifacts.swiftModels);
    logger.success(`Generated ${paths.swiftModels}`);
  }

  writeFileEnsuringDir(paths.objcImplementation, artifacts.objcImplementation);
  logger.success(`Generated ${paths.objcImplementation}`);

  writeFileEnsuringDir(paths.kotlinDelegate, artifacts.kotlinDelegate);
  logger.success(`Generated ${paths.kotlinDelegate}`);

  writeFileEnsuringDir(paths.kotlinModule, artifacts.kotlinModule);
  logger.success(`Generated ${paths.kotlinModule}`);

  if (artifacts.kotlinModels) {
    writeFileEnsuringDir(paths.kotlinModels, artifacts.kotlinModels);
    logger.success(`Generated ${paths.kotlinModels}`);
  }
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
  if (artifacts.swiftModels) {
    logger.info('\n--- Generated: ios/BrownfieldNavigationModels.swift ---\n');
    logger.log(artifacts.swiftModels);
  }
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
  if (artifacts.kotlinModels) {
    logger.info(
      `\n--- Generated: android/src/main/java/${androidJavaPackageName.replaceAll('.', '/')}/BrownfieldNavigationModels.kt ---\n`
    );
    logger.log(artifacts.kotlinModels);
  }
}

export async function runNavigationCodegen({
  specPath,
  dryRun = false,
  projectRoot = process.cwd(),
}: RunNavigationCodegenOptions): Promise<void> {
  const resolvedSpecPath = resolveNavigationSpecPath(specPath, projectRoot);
  if (!fs.existsSync(resolvedSpecPath)) {
    throw new Error(`Spec file not found: ${resolvedSpecPath}`);
  }

  intro(`Running Brownfield Navigation codegen`);

  logger.info(`Parsing spec file: ${resolvedSpecPath}`);
  const { methods, referencedTypeDeclarations, modelDefinitions } =
    parseNavigationSpec(resolvedSpecPath);
  if (methods.length === 0) {
    throw new Error('No methods found in spec file');
  }

  logger.info(
    `Found ${methods.length} method${methods.length === 1 ? '' : 's'}: ${methods.map((method) => method.name).join(', ')}`
  );

  const packageRoot = getNavigationPackagePath(projectRoot);
  const androidJavaPackageName = DEFAULT_ANDROID_JAVA_PACKAGE;
  const indexTs = generateIndexTs(methods, referencedTypeDeclarations);
  const models = await generateNavigationModels({
    specPath: resolvedSpecPath,
    methods,
    kotlinPackageName: androidJavaPackageName,
    modelDefinitions,
  });

  const artifacts: GeneratedNavigationArtifacts = {
    turboModuleSpec: generateTurboModuleSpec(methods, referencedTypeDeclarations, {
      modelTypeNames: models.modelTypeNames,
    }),
    indexTs,
    indexJs: transpileWithConsumerBabel(indexTs, projectRoot, packageRoot),
    indexDts: generateIndexDts(methods, referencedTypeDeclarations),
    swiftDelegate: generateSwiftDelegate(methods, {
      modelTypeNames: models.modelTypeNames,
    }),
    objcImplementation: generateObjCImplementation(methods, {
      modelTypeNames: models.modelTypeNames,
    }),
    kotlinDelegate: generateKotlinDelegate(methods, androidJavaPackageName, {
      modelTypeNames: models.modelTypeNames,
    }),
    kotlinModule: generateKotlinModule(methods, androidJavaPackageName, {
      modelTypeNames: models.modelTypeNames,
    }),
  };

  if (models.modelTypeNames.length > 0) {
    logger.info(
      `Generating quicktype models for types: ${models.modelTypeNames.join(', ')}`
    );
    artifacts.swiftModels = models.swiftModels;
    artifacts.kotlinModels = models.kotlinModels;
  } else {
    logger.info(
      'No complex model types found; skipping quicktype model generation'
    );
  }

  if (dryRun) {
    printDryRun(androidJavaPackageName, artifacts);
    outro('Brownfield Navigation codegen done');
    return;
  }

  writeArtifacts(
    getOutputPaths(packageRoot, androidJavaPackageName),
    artifacts
  );

  outro('Brownfield Navigation codegen done');
}
