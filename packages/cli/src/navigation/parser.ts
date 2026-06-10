import fs from 'node:fs';
import { Project } from 'ts-morph';

import type {
  ModelDefinition,
  ModelFieldDefinition,
  MethodParam,
  MethodSignature,
  ParsedNavigationSpec,
  TypeDeclaration,
} from './types.js';
import { Node } from 'ts-morph';

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

function collectReferencedTypesFromText(typeText: string): string[] {
  const matches = typeText.match(/\b[A-Za-z_]\w*\b/g);
  if (!matches) {
    return [];
  }

  return matches.filter((match) => !SKIP_TYPE_TOKENS.has(match));
}

export function parseNavigationSpec(specPath: string): ParsedNavigationSpec {
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

  const methods = specInterface.getMethods().map((method): MethodSignature => {
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

  const declarationNodes = [
    ...sourceFile.getTypeAliases(),
    ...sourceFile.getInterfaces(),
  ].filter((node) => {
    const nodeName = node.getName();
    return nodeName !== 'BrownfieldNavigationSpec' && nodeName !== 'Spec';
  });

  const declarationByName = new Map<string, string>(
    declarationNodes.map((node) => {
      const declarationText = node.getText();
      const normalizedDeclaration = node.isExported()
        ? declarationText
        : `export ${declarationText}`;
      return [node.getName(), normalizedDeclaration];
    })
  );
  const referencedTypeNames = new Set<string>();
  for (const method of methods) {
    for (const typeText of [
      method.returnType,
      ...method.params.map((param) => param.type),
    ]) {
      for (const typeName of collectReferencedTypesFromText(typeText)) {
        referencedTypeNames.add(typeName);
      }
    }
  }

  const referencedTypeDeclarations: TypeDeclaration[] = [];
  const modelDefinitions: ModelDefinition[] = [];
  const addedTypeNames = new Set<string>();
  const queue = [...referencedTypeNames];

  while (queue.length > 0) {
    const typeName = queue.shift();
    if (!typeName || addedTypeNames.has(typeName)) {
      continue;
    }

    const declaration = declarationByName.get(typeName);
    if (!declaration) {
      continue;
    }

    addedTypeNames.add(typeName);
    referencedTypeDeclarations.push({ name: typeName, declaration });
    const declarationNode = declarationNodes.find((node) => node.getName() === typeName);
    if (declarationNode) {
      const fields = extractModelFields(declarationNode);
      if (fields.length > 0) {
        modelDefinitions.push({ name: typeName, fields });
      }
    }

    for (const nestedTypeName of collectReferencedTypesFromText(declaration)) {
      if (
        !addedTypeNames.has(nestedTypeName) &&
        declarationByName.has(nestedTypeName)
      ) {
        queue.push(nestedTypeName);
      }
    }
  }

  return {
    methods,
    referencedTypeDeclarations,
    modelDefinitions,
  };
}

function extractModelFields(node: Node): ModelFieldDefinition[] {
  if (Node.isInterfaceDeclaration(node)) {
    return node.getProperties().map((property) => ({
      name: property.getName(),
      type: property.getTypeNode()?.getText() ?? 'unknown',
      optional: property.hasQuestionToken(),
    }));
  }

  if (Node.isTypeAliasDeclaration(node)) {
    const typeNode = node.getTypeNode();
    if (!typeNode || !Node.isTypeLiteral(typeNode)) {
      return [];
    }
    return typeNode.getProperties().map((property) => ({
      name: property.getName(),
      type: property.getTypeNode()?.getText() ?? 'unknown',
      optional: property.hasQuestionToken(),
    }));
  }

  return [];
}
