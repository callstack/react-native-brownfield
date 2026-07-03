import path from 'node:path';
import { createRequire } from 'node:module';

import type { MethodSignature, TypeDeclaration } from '../types.js';

interface TurboSpecGenerationOptions {
  modelTypeNames?: string[];
}

function mapTypeForTurboSpec(
  typeText: string,
  options: TurboSpecGenerationOptions
): string {
  if (typeText.startsWith('Promise<')) {
    const inner = typeText.slice(8, -1);
    return `Promise<${mapTypeForTurboSpec(inner, options)}>`;
  }

  if (options.modelTypeNames?.includes(typeText)) {
    return 'Object';
  }

  return typeText;
}

export function generateTurboModuleSpec(
  methods: MethodSignature[],
  referencedTypeDeclarations: TypeDeclaration[] = [],
  options: TurboSpecGenerationOptions = {}
): string {
  const methodSignatures = methods
    .map((method) => {
      const params = method.params
        .map(
          (param) =>
            `${param.name}${param.optional ? '?' : ''}: ${mapTypeForTurboSpec(param.type, options)}`
        )
        .join(', ');
      return `  ${method.name}(${params}): ${mapTypeForTurboSpec(method.returnType, options)};`;
    })
    .join('\n');
  const typeDeclarationsBlock =
    referencedTypeDeclarations.length === 0
      ? ''
      : `${referencedTypeDeclarations.map((entry) => entry.declaration).join('\n\n')}\n\n`;

  return `import { TurboModuleRegistry, type TurboModule } from 'react-native';

${typeDeclarationsBlock}export interface Spec extends TurboModule {
${methodSignatures}
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'NativeBrownfieldNavigation'
);
`;
}

const SKIP_TYPE_TOKENS = new Set([
  'Array',
  'Date',
  'Map',
  'Object',
  'Promise',
  'ReadonlyArray',
  'Record',
  'Set',
  'any',
  'boolean',
  'false',
  'null',
  'number',
  'object',
  'string',
  'true',
  'undefined',
  'unknown',
  'void',
]);

function collectTypesUsedByMethods(methods: MethodSignature[]): Set<string> {
  const used = new Set<string>();

  for (const method of methods) {
    const typeTexts = [
      method.returnType,
      ...method.params.map((param) => param.type),
    ];

    for (const typeText of typeTexts) {
      const matches = typeText.match(/\b[A-Za-z_]\w*\b/g);
      if (!matches) {
        continue;
      }

      for (const name of matches) {
        if (!SKIP_TYPE_TOKENS.has(name)) {
          used.add(name);
        }
      }
    }
  }

  return used;
}

function buildTypeImportLine(
  methods: MethodSignature[],
  referencedTypeDeclarations: TypeDeclaration[]
): string {
  if (referencedTypeDeclarations.length === 0) {
    return '';
  }

  const usedTypes = collectTypesUsedByMethods(methods);
  const names = referencedTypeDeclarations
    .map((entry) => entry.name)
    .filter((name) => usedTypes.has(name))
    .join(', ');

  if (names.length === 0) {
    return '';
  }

  return `import type { ${names} } from './NativeBrownfieldNavigation';\n`;
}

export function generateIndexTs(
  methods: MethodSignature[],
  referencedTypeDeclarations: TypeDeclaration[] = []
): string {
  const typeImportLine = buildTypeImportLine(methods, referencedTypeDeclarations);
  const functionImplementations = methods
    .map((method) => {
      const params = method.params
        .map((param) => `${param.name}${param.optional ? '?' : ''}: ${param.type}`)
        .join(', ');
      const args = method.params.map((param) => param.name).join(', ');
      const returnType = method.returnType === 'void' ? '' : `: ${method.returnType}`;

      if (method.isAsync) {
        return `  ${method.name}: async (${params})${returnType} => {
    return NativeBrownfieldNavigation.${method.name}(${args});
  }`;
      }

      return `  ${method.name}: (${params})${returnType} => {
    NativeBrownfieldNavigation.${method.name}(${args});
  }`;
    })
    .join(',\n');

  return `import NativeBrownfieldNavigation from './NativeBrownfieldNavigation';
${typeImportLine}

const BrownfieldNavigation = {
${functionImplementations},
};

export default BrownfieldNavigation;
`;
}

export function transpileWithConsumerBabel(
  tsCode: string,
  projectRoot: string,
  packageRoot: string
): string {
  const nodeRequire = createRequire(path.join(projectRoot, 'package.json'));
  const moduleCandidates = [projectRoot, packageRoot];

  function resolveOrThrow(moduleName: string): string {
    for (const modulePath of moduleCandidates) {
      try {
        return nodeRequire.resolve(moduleName, { paths: [modulePath] });
      } catch {
        // Continue with remaining candidates.
      }
    }

    throw new Error(
      `Could not resolve "${moduleName}". Install it in your app devDependencies.`
    );
  }

  const babelCorePath = resolveOrThrow('@babel/core');
  const rnPresetPath = resolveOrThrow('@react-native/babel-preset');
  const babelCore = nodeRequire(babelCorePath) as {
    transformSync: (
      source: string,
      options: Record<string, unknown>
    ) => { code?: string | null } | null;
  };

  const transformed = babelCore.transformSync(tsCode, {
    filename: 'index.ts',
    babelrc: false,
    configFile: false,
    comments: false,
    compact: true,
    minified: true,
    presets: [[rnPresetPath, {}]],
  });

  if (!transformed?.code) {
    throw new Error('Babel transpilation failed for generated index.ts');
  }

  return transformed.code;
}

export function generateIndexDts(
  methods: MethodSignature[],
  referencedTypeDeclarations: TypeDeclaration[] = []
): string {
  const typeImportLine = buildTypeImportLine(methods, referencedTypeDeclarations);
  const methodSignatures = methods
    .map((method) => {
      const params = method.params
        .map((param) => `${param.name}${param.optional ? '?' : ''}: ${param.type}`)
        .join(', ');
      return `  ${method.name}: (${params}) => ${method.returnType};`;
    })
    .join('\n');

  return `${typeImportLine}declare const BrownfieldNavigation: {
${methodSignatures}
};

export default BrownfieldNavigation;
`;
}
