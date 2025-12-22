import fs from 'fs';
import path from 'path';
import {
  quicktype,
  InputData,
  JSONSchemaInput,
  FetchingJSONSchemaStore,
} from 'quicktype-core';
import { schemaForTypeScriptSources } from 'quicktype-typescript-input';

export interface SwiftGeneratorOptions {
  name: string;
  schemaPath: string;
  typeName: string;
  outputPath: string;
}

/**
 * Generates Swift Codable struct from TypeScript schema.
 */
export async function generateSwift(
  options: SwiftGeneratorOptions
): Promise<void> {
  const { name, schemaPath, typeName, outputPath } = options;

  const absoluteSchemaPath = path.resolve(process.cwd(), schemaPath);

  if (!fs.existsSync(absoluteSchemaPath)) {
    throw new Error(`Schema file not found: ${absoluteSchemaPath}`);
  }

  const schemaData = schemaForTypeScriptSources([absoluteSchemaPath]);
  if (!schemaData.schema) {
    throw new Error('Failed to generate schema from TypeScript');
  }

  const parsedSchema = JSON.parse(schemaData.schema);
  const definitions = parsedSchema.definitions as
    | Record<string, unknown>
    | undefined;

  if (!definitions?.[typeName]) {
    throw new Error(
      `Type "${typeName}" not found in schema. Available types: ${Object.keys(definitions || {}).join(', ')}`
    );
  }

  parsedSchema.$ref = `#/definitions/${typeName}`;
  const modifiedSchema = JSON.stringify(parsedSchema);

  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());
  await schemaInput.addSource({
    name: typeName,
    schema: modifiedSchema,
  });

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  const { lines } = await quicktype({
    inputData,
    lang: 'swift',
    rendererOptions: {
      'mutable-properties': 'true',
      initializers: 'false',
    },
  });

  const storeNameExtension = `
extension ${typeName}: BrownieStoreProtocol {
  public static let storeName = "${name}"
}
`;

  const swiftOutput =
    'import Brownie\n\n' + lines.join('\n') + storeNameExtension;
  const absoluteOutputPath = path.resolve(process.cwd(), outputPath);
  const outputDir = path.dirname(absoluteOutputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(absoluteOutputPath, swiftOutput);
}
