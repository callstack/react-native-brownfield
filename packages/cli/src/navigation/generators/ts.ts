import path from 'node:path';
import { createRequire } from 'node:module';

import type { MethodSignature } from '../types.js';

export function generateTurboModuleSpec(methods: MethodSignature[]): string {
  const methodSignatures = methods
    .map((method) => {
      const params = method.params
        .map((param) => `${param.name}${param.optional ? '?' : ''}: ${param.type}`)
        .join(', ');
      return `  ${method.name}(${params}): ${method.returnType};`;
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

export function generateIndexTs(methods: MethodSignature[]): string {
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

export function generateIndexDts(methods: MethodSignature[]): string {
  const methodSignatures = methods
    .map((method) => {
      const params = method.params
        .map((param) => `${param.name}${param.optional ? '?' : ''}: ${param.type}`)
        .join(', ');
      return `  ${method.name}: (${params}) => ${method.returnType};`;
    })
    .join('\n');

  return `declare const BrownfieldNavigation: {
${methodSignatures}
};

export default BrownfieldNavigation;
`;
}
