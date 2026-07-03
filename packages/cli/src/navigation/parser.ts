import fs from 'node:fs';
import { Project } from 'ts-morph';

import type {
  CallbackSignature,
  ModelDefinition,
  ModelFieldDefinition,
  MethodParam,
  MethodSignature,
  ParsedNavigationSpec,
  TypeDeclaration,
} from './types.js';
import { Node } from 'ts-morph';
import type { TypeNode } from 'ts-morph';

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

function getPromiseInnerType(typeText: string): string | undefined {
  return typeText.startsWith('Promise<') && typeText.endsWith('>')
    ? typeText.slice(8, -1)
    : undefined;
}

function parseCallbackSignature(
  typeNode: TypeNode | undefined
): CallbackSignature | undefined {
  if (!typeNode || !Node.isFunctionTypeNode(typeNode)) {
    return undefined;
  }

  return {
    params: typeNode.getParameters().map((param) => ({
      name: param.getName(),
      type: param.getTypeNode()?.getText() ?? 'unknown',
      optional: param.isOptional(),
    })),
    returnType: typeNode.getReturnTypeNode()?.getText() ?? 'void',
  };
}

function validateMethodSignature(method: MethodSignature): void {
  for (const param of method.params) {
    if (getPromiseInnerType(param.type)) {
      throw new Error(
        `Unsupported Promise parameter "${param.name}" in method "${method.name}": Promise<T> is only supported as a method return type.`
      );
    }

    if (!param.callback) {
      continue;
    }

    if (param.callback.returnType !== 'void') {
      throw new Error(
        `Unsupported callback parameter "${param.name}" in method "${method.name}": callback return type "${param.callback.returnType}" is not supported. Use a void callback or model the result as a Promise-returning navigation method.`
      );
    }
  }
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
      const callback = parseCallbackSignature(typeNode);
      const methodParam: MethodParam = {
        name: param.getName(),
        type: typeNode?.getText() ?? 'unknown',
        optional: param.isOptional(),
      };
      if (callback) {
        methodParam.callback = callback;
      }
      return methodParam;
    });
    const returnTypeNode = method.getReturnTypeNode();
    const returnType = returnTypeNode?.getText() ?? 'void';
    const promiseReturnType = getPromiseInnerType(returnType);

    const methodSignature: MethodSignature = {
      name,
      params,
      returnType,
      isAsync: Boolean(promiseReturnType),
    };
    if (promiseReturnType) {
      methodSignature.promiseReturnType = promiseReturnType;
    }
    validateMethodSignature(methodSignature);
    return methodSignature;
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
