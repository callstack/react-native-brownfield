import fs from 'node:fs';
import { Project } from 'ts-morph';

import type { MethodParam, MethodSignature } from './types.js';

export function parseNavigationSpec(specPath: string): MethodSignature[] {
  if (!fs.existsSync(specPath)) {
    throw new Error(`Spec file not found: ${specPath}`);
  }

  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(specPath);
  const specInterface =
    sourceFile.getInterface('BrownfieldNavigationSpec') ??
    sourceFile.getInterface('Spec');

  if (!specInterface) {
    throw new Error(
      'Could not find BrownfieldNavigationSpec or Spec interface in spec file'
    );
  }

  return specInterface.getMethods().map((method): MethodSignature => {
    const name = method.getName();
    const params: MethodParam[] = method.getParameters().map((param) => {
      const typeNode = param.getTypeNode();
      return {
        name: param.getName(),
        type: typeNode?.getText() ?? 'unknown',
        optional: param.isOptional(),
      };
    });
    const returnTypeNode = method.getReturnTypeNode();
    const returnType = returnTypeNode?.getText() ?? 'void';

    return {
      name,
      params,
      returnType,
      isAsync: returnType.startsWith('Promise<'),
    };
  });
}
