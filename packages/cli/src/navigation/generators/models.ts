import fs from 'node:fs';
import path from 'node:path';
import {
  FetchingJSONSchemaStore,
  InputData,
  JSONSchemaInput,
  quicktype,
} from 'quicktype-core';
import { schemaForTypeScriptSources } from 'quicktype-typescript-input';

import type { MethodSignature, ModelDefinition } from '../types.js';

export interface NavigationModelsOptions {
  specPath: string;
  methods: MethodSignature[];
  kotlinPackageName: string;
  modelDefinitions?: ModelDefinition[];
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
          'struct-or-class': 'class',
          'objective-c-support': 'true',
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
  modelDefinitions = [],
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

  const swiftModelConversions = generateSwiftModelConversionExtensions(
    modelDefinitions,
    modelTypeNames
  );
  const kotlinModelConversions = generateKotlinModelConversionExtensions(
    modelDefinitions,
    modelTypeNames
  );

  return {
    swiftModels: swiftModelConversions
      ? `${swiftModels}\n\n${swiftModelConversions}`
      : swiftModels,
    kotlinModels: kotlinModelConversions
      ? `${ensureKotlinReadableMapImport(kotlinModels)}\n\n${kotlinModelConversions}`
      : kotlinModels,
    modelTypeNames,
  };
}

function ensureKotlinReadableMapImport(kotlinModels: string): string {
  const importLine = 'import com.facebook.react.bridge.ReadableMap';
  if (kotlinModels.includes(importLine)) {
    return kotlinModels;
  }

  const packageMatch = kotlinModels.match(/^package[^\n]*\n/);
  if (!packageMatch) {
    return `${importLine}\n${kotlinModels}`;
  }

  const packageLine = packageMatch[0];
  const rest = kotlinModels.slice(packageLine.length);
  return `${packageLine}\n${importLine}\n${rest}`;
}

function generateSwiftModelConversionExtensions(
  modelDefinitions: ModelDefinition[],
  modelTypeNames: string[]
): string {
  const modelDefinitionsByLookupName = buildModelDefinitionsByLookupName(
    modelDefinitions
  );
  const conversionModelNames = collectConversionModelNames(
    modelDefinitionsByLookupName,
    modelTypeNames
  );

  return conversionModelNames
    .map((modelName) => {
      const definition = modelDefinitionsByLookupName.get(modelName);
      if (!definition) {
        return '';
      }

      const sortedFields = [...definition.fields].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      if (sortedFields.length === 0) {
        return '';
      }

      const args = sortedFields
        .map(
          (field) =>
            `${field.name}: ${mapDictionaryValueToSwiftExpression(
              field.name,
              field.type,
              field.optional
            )}`
        )
        .join(', ');

      return `@objc public extension ${modelName} {
    static func fromDictionary(_ value: NSDictionary) -> ${modelName} {
        return ${modelName}(${args})
    }
}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

function mapDictionaryValueToSwiftExpression(
  fieldName: string,
  fieldType: string,
  optional: boolean
): string {
  const parsedType = parseFieldType(fieldType);
  const normalizedFieldType = parsedType.normalizedType;
  const valueAccess = `value["${fieldName}"]`;
  const allowsNil = optional || parsedType.nullable;
  if (normalizedFieldType === 'string') {
    return allowsNil ? `${valueAccess} as? String` : `${valueAccess} as! String`;
  }
  if (normalizedFieldType === 'number') {
    return allowsNil
      ? `(${valueAccess} as? NSNumber)?.doubleValue`
      : `(${valueAccess} as! NSNumber).doubleValue`;
  }
  if (normalizedFieldType === 'boolean') {
    return allowsNil
      ? `(${valueAccess} as? NSNumber)?.boolValue`
      : `(${valueAccess} as! NSNumber).boolValue`;
  }
  if (normalizedFieldType === 'string[]') {
    return allowsNil ? `${valueAccess} as? [String]` : `${valueAccess} as! [String]`;
  }

  if (isSimpleTypeReference(normalizedFieldType)) {
    const nestedModelType = resolveNestedModelTypeName(normalizedFieldType);
    return allowsNil
      ? `(${valueAccess} as? NSDictionary).map(${nestedModelType}.fromDictionary)`
      : `${nestedModelType}.fromDictionary(${valueAccess} as! NSDictionary)`;
  }

  return `fatalError("Unsupported TypeScript field type '${escapeSwiftStringLiteral(normalizedFieldType)}' for field '${escapeSwiftStringLiteral(fieldName)}' in Swift conversion. Consider using 'Any' or a custom converter.")`;
}

function generateKotlinModelConversionExtensions(
  modelDefinitions: ModelDefinition[],
  modelTypeNames: string[]
): string {
  const modelDefinitionsByLookupName = buildModelDefinitionsByLookupName(
    modelDefinitions
  );
  const conversionModelNames = collectConversionModelNames(
    modelDefinitionsByLookupName,
    modelTypeNames
  );
  let usesStringArrayHelper = false;

  const conversionFunctions = conversionModelNames
    .map((modelName) => {
      const definition = modelDefinitionsByLookupName.get(modelName);
      if (!definition) {
        return '';
      }

      const sortedFields = [...definition.fields].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      if (sortedFields.length === 0) {
        return '';
      }

      const args = sortedFields
        .map((field) => {
          const fieldExpression = mapReadableMapFieldExpression(
            'value',
            field.name,
            field.type,
            field.optional
          );
          if (fieldExpression.includes('readStringArray(')) {
            usesStringArrayHelper = true;
          }
          return `${field.name} = ${fieldExpression}`;
        })
        .join(', ');

      return `fun to${modelName}(value: ReadableMap): ${modelName} {
    return ${modelName}(${args})
}`;
    })
    .filter(Boolean)
    .join('\n\n');

  if (!usesStringArrayHelper) {
    return conversionFunctions;
  }

  const stringArrayHelper = `private fun readStringArray(value: ReadableMap, key: String, required: Boolean): List<String>? {
    if (!value.hasKey(key) || value.isNull(key)) {
        if (required) error("Missing required array field '$key'")
        return null
    }
    val array = value.getArray(key) ?: return null
    return array.toArrayList().map {
        it as? String ?: error("Expected string elements for array field '$key'")
    }
}`;

  return conversionFunctions
    ? `${conversionFunctions}\n\n${stringArrayHelper}`
    : stringArrayHelper;
}

function mapReadableMapFieldExpression(
  mapName: string,
  fieldName: string,
  fieldType: string,
  optional: boolean
): string {
  const parsedType = parseFieldType(fieldType);
  const normalizedFieldType = parsedType.normalizedType;
  const allowsNull = optional || parsedType.nullable;
  if (normalizedFieldType === 'string') {
    return allowsNull
      ? `${mapName}.getString("${fieldName}")`
      : `${mapName}.getString("${fieldName}")!!`;
  }
  if (normalizedFieldType === 'number') {
    return allowsNull
      ? `if (${mapName}.hasKey("${fieldName}") && !${mapName}.isNull("${fieldName}")) ${mapName}.getDouble("${fieldName}") else null`
      : `${mapName}.getDouble("${fieldName}")`;
  }
  if (normalizedFieldType === 'boolean') {
    return allowsNull
      ? `if (${mapName}.hasKey("${fieldName}") && !${mapName}.isNull("${fieldName}")) ${mapName}.getBoolean("${fieldName}") else null`
      : `${mapName}.getBoolean("${fieldName}")`;
  }
  if (normalizedFieldType === 'string[]') {
    return allowsNull
      ? `readStringArray(${mapName}, "${fieldName}", false)`
      : `readStringArray(${mapName}, "${fieldName}", true)!!`;
  }
  if (isSimpleTypeReference(normalizedFieldType)) {
    const nestedModelType = resolveNestedModelTypeName(normalizedFieldType);
    return allowsNull
      ? `${mapName}.getMap("${fieldName}")?.let { to${nestedModelType}(it) }`
      : `to${nestedModelType}(${mapName}.getMap("${fieldName}")!!)`;
  }
  return `error("Unsupported TypeScript field type '${escapeKotlinStringLiteral(normalizedFieldType)}' for field '${escapeKotlinStringLiteral(fieldName)}' in Kotlin conversion. Consider using 'Any' or a custom converter.")`;
}

function isSimpleTypeReference(typeName: string): boolean {
  return /^[A-Za-z_]\w*$/.test(typeName);
}

function escapeSwiftStringLiteral(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function escapeKotlinStringLiteral(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function parseFieldType(fieldType: string): {
  normalizedType: string;
  nullable: boolean;
} {
  const unionTypes = fieldType
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  const nullable = unionTypes.includes('null') || unionTypes.includes('undefined');
  const nonNullableTypes = unionTypes.filter(
    (part) => part !== 'null' && part !== 'undefined'
  );
  const normalizedType =
    nonNullableTypes.length === 1 ? nonNullableTypes[0] : fieldType.trim();
  return { normalizedType, nullable };
}

function resolveNestedModelTypeName(typeName: string): string {
  if (typeName.endsWith('Type') && typeName.length > 'Type'.length) {
    return typeName.slice(0, -'Type'.length);
  }
  return typeName;
}

function buildModelDefinitionsByLookupName(
  modelDefinitions: ModelDefinition[]
): Map<string, ModelDefinition> {
  const definitionsByLookupName = new Map<string, ModelDefinition>();
  for (const definition of modelDefinitions) {
    if (!definitionsByLookupName.has(definition.name)) {
      definitionsByLookupName.set(definition.name, definition);
    }
    const nestedName = resolveNestedModelTypeName(definition.name);
    if (
      nestedName !== definition.name &&
      !definitionsByLookupName.has(nestedName)
    ) {
      definitionsByLookupName.set(nestedName, definition);
    }
  }
  return definitionsByLookupName;
}

function collectConversionModelNames(
  modelDefinitionsByLookupName: Map<string, ModelDefinition>,
  modelTypeNames: string[]
): string[] {
  const queue = [...modelTypeNames];
  const visited = new Set<string>();
  const orderedModelNames: string[] = [];

  while (queue.length > 0) {
    const modelName = queue.shift();
    if (!modelName || visited.has(modelName)) {
      continue;
    }
    visited.add(modelName);

    const definition = modelDefinitionsByLookupName.get(modelName);
    if (!definition) {
      continue;
    }
    orderedModelNames.push(modelName);

    for (const field of definition.fields) {
      const parsedFieldType = parseFieldType(field.type);
      if (!isSimpleTypeReference(parsedFieldType.normalizedType)) {
        continue;
      }
      const nestedModelName = resolveNestedModelTypeName(
        parsedFieldType.normalizedType
      );
      if (!visited.has(nestedModelName)) {
        queue.push(nestedModelName);
      }
    }
  }

  return orderedModelNames;
}
