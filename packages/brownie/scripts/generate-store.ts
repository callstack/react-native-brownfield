#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import {
  quicktype,
  InputData,
  JSONSchemaInput,
  FetchingJSONSchemaStore,
} from 'quicktype-core';
import { schemaForTypeScriptSources } from 'quicktype-typescript-input';

interface StoresConfig {
  schema: string;
  typeName: string;
  swift: string;
}

interface PackageJson {
  brownie?: {
    stores?: StoresConfig;
  };
}

async function main() {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.error('Error: package.json not found');
    process.exit(1);
  }

  const packageJson: PackageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, 'utf-8')
  );
  const config = packageJson.brownie?.stores;

  if (!config) {
    console.error('Error: brownie.stores config not found in package.json');
    process.exit(1);
  }

  const { schema, typeName, swift } = config;

  if (!schema) {
    console.error('Error: brownie.stores.schema is required');
    process.exit(1);
  }

  if (!typeName) {
    console.error('Error: brownie.stores.typeName is required');
    process.exit(1);
  }

  if (!swift) {
    console.error('Error: brownie.stores.swift is required');
    process.exit(1);
  }

  const schemaPath = path.resolve(process.cwd(), schema);

  if (!fs.existsSync(schemaPath)) {
    console.error(`Error: Schema file not found: ${schemaPath}`);
    process.exit(1);
  }

  console.log(`Generating Swift from ${schema}...`);

  try {
    const schemaData = schemaForTypeScriptSources([schemaPath]);
    if (!schemaData.schema) {
      console.error('Error: Failed to generate schema from TypeScript');
      process.exit(1);
    }
    const parsedSchema = JSON.parse(schemaData.schema);

    const definitions = parsedSchema.definitions as
      | Record<string, unknown>
      | undefined;
    if (!definitions?.[typeName]) {
      console.error(
        `Error: Type "${typeName}" not found in schema. Available types: ${Object.keys(definitions || {}).join(', ')}`
      );
      process.exit(1);
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

    const swiftOutput = lines.join('\n');
    const swiftPath = path.resolve(process.cwd(), swift);
    const swiftDir = path.dirname(swiftPath);

    if (!fs.existsSync(swiftDir)) {
      fs.mkdirSync(swiftDir, { recursive: true });
    }

    fs.writeFileSync(swiftPath, swiftOutput);
    console.log(`Generated: ${swift}`);
  } catch (error) {
    console.error(
      'Error generating Swift:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

main();
