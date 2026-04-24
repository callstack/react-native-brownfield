import fs from 'node:fs';
import path from 'node:path';
import {
  quicktype,
  InputData,
  JSONSchemaInput,
  FetchingJSONSchemaStore,
} from 'quicktype-core';
import { schemaForTypeScriptSources } from 'quicktype-typescript-input';

export interface KotlinGeneratorOptions {
  name: string;
  schemaPath: string;
  typeName: string;
  outputPath: string;
  packageName?: string;
}

/**
 * Extracts Kotlin package name from output path.
 * e.g. "./kotlin/app/src/main/java/com/example/generated/BrownfieldStore.kt" -> "com.example.generated"
 */
function extractPackageName(outputPath: string): string {
  const javaIndex = outputPath.indexOf('/java/');
  if (javaIndex === -1) {
    return 'generated';
  }

  const packagePath = outputPath.slice(javaIndex + 6);
  const parts = packagePath.split('/');
  parts.pop();
  return parts.join('.');
}

/**
 * Generates Kotlin data class from TypeScript schema.
 */
export async function generateKotlin(
  options: KotlinGeneratorOptions
): Promise<void> {
  const {
    name,
    schemaPath,
    typeName,
    outputPath,
    packageName: configPackageName,
  } = options;

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

  const absoluteOutputPath = path.resolve(process.cwd(), outputPath);
  const packageName =
    configPackageName ?? extractPackageName(absoluteOutputPath);

  const { lines } = await quicktype({
    inputData,
    lang: 'kotlin',
    rendererOptions: {
      framework: 'just-types',
      package: packageName,
    },
  });

  let kotlinOutput = lines.join('\n');

  const companionObject = ` {
    companion object {
        const val STORE_NAME = "${name}"
    }
}`;
  const classPattern = new RegExp(`(data class ${typeName}\\s*\\([^)]*\\))`);
  kotlinOutput = kotlinOutput.replace(classPattern, `$1${companionObject}`);

  const outputDir = path.dirname(absoluteOutputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(absoluteOutputPath, kotlinOutput);
}
