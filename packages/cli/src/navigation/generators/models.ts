import fs from 'node:fs';
import path from 'node:path';
import {
  FetchingJSONSchemaStore,
  InputData,
  JSONSchemaInput,
  quicktype,
} from 'quicktype-core';
import { schemaForTypeScriptSources } from 'quicktype-typescript-input';

import type { MethodSignature } from '../types.js';

export interface NavigationModelsOptions {
  specPath: string;
  methods: MethodSignature[];
  kotlinPackageName: string;
}

export interface GeneratedNavigationModels {
  swiftModels?: string;
  kotlinModels?: string;
  modelTypeNames: string[];
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

function collectReferencedTypes(methods: MethodSignature[]): Set<string> {
  const referenced = new Set<string>();

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
      for (const match of matches) {
        if (!SKIP_TYPE_TOKENS.has(match)) {
          referenced.add(match);
        }
      }
    }
  }

  return referenced;
}

async function generateModelsForLanguage({
  typeNames,
  schema,
  lang,
  kotlinPackageName,
}: {
  typeNames: string[];
  schema: object;
  lang: 'swift' | 'kotlin';
  kotlinPackageName: string;
}): Promise<string> {
  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());

  for (const typeName of typeNames) {
    const rootSchema = JSON.parse(JSON.stringify(schema)) as {
      $ref?: string;
    };
    rootSchema.$ref = `#/definitions/${typeName}`;

    await schemaInput.addSource({
      name: typeName,
      schema: JSON.stringify(rootSchema),
    });
  }

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  const rendererOptions =
    lang === 'swift'
      ? {
          'access-level': 'public',
          'mutable-properties': 'true',
          initializers: 'false',
          'swift-5-support': 'true',
        }
      : {
          framework: 'just-types',
          package: kotlinPackageName,
        };

  const { lines } = await quicktype({
    inputData,
    lang,
    rendererOptions,
  });

  return lines.join('\n');
}

export async function generateNavigationModels({
  specPath,
  methods,
  kotlinPackageName,
}: NavigationModelsOptions): Promise<GeneratedNavigationModels> {
  const absoluteSpecPath = path.resolve(process.cwd(), specPath);

  if (!fs.existsSync(absoluteSpecPath)) {
    throw new Error(`Spec file not found: ${absoluteSpecPath}`);
  }

  const schemaData = schemaForTypeScriptSources([absoluteSpecPath]);
  if (!schemaData.schema) {
    throw new Error('Failed to generate schema from TypeScript spec');
  }

  const parsedSchema = JSON.parse(schemaData.schema) as {
    definitions?: Record<string, unknown>;
  };
  const referencedTypes = collectReferencedTypes(methods);
  const definitions = parsedSchema.definitions ?? {};
  const modelTypeNames = [...referencedTypes].filter((typeName) =>
    Object.hasOwn(definitions, typeName)
  );

  if (modelTypeNames.length === 0) {
    return { modelTypeNames: [] };
  }

  const [swiftModels, kotlinModels] = await Promise.all([
    generateModelsForLanguage({
      typeNames: modelTypeNames,
      schema: parsedSchema,
      lang: 'swift',
      kotlinPackageName,
    }),
    generateModelsForLanguage({
      typeNames: modelTypeNames,
      schema: parsedSchema,
      lang: 'kotlin',
      kotlinPackageName,
    }),
  ]);

  return {
    swiftModels,
    kotlinModels,
    modelTypeNames,
  };
}
