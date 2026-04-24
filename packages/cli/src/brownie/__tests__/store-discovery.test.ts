import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, afterEach } from 'vitest';
import { discoverStores } from '../store-discovery.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '../__fixtures__');

function createTempDir(): string {
  return fs.mkdtempSync(path.join(FIXTURES_DIR, 'temp-'));
}

function createBrownieFile(dir: string, name: string, content: string): void {
  fs.writeFileSync(path.join(dir, `${name}.brownie.ts`), content);
}

function cleanupTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeBrownieContent(storeName: string, fields: string = ''): string {
  return `type ${storeName} = {
  ${fields}
};

declare module '@callstack/brownie' {
  interface BrownieStores {
    ${storeName}: ${storeName};
  }
}
`;
}

function makeMultiStoreBrownieContent(
  stores: { name: string; fields?: string }[]
): string {
  const types = stores
    .map((s) => `type ${s.name} = { ${s.fields || ''} };`)
    .join('\n\n');
  const props = stores.map((s) => `    ${s.name}: ${s.name};`).join('\n');
  return `${types}

declare module '@callstack/brownie' {
  interface BrownieStores {
${props}
  }
}
`;
}

describe('discoverStores', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      cleanupTempDir(tempDir);
      tempDir = null;
    }
  });

  it('throws when no brownie files found', () => {
    tempDir = createTempDir();
    expect(() => discoverStores(tempDir!)).toThrow(
      'No brownie store files found'
    );
  });

  it('throws when brownie file has no BrownieStores interface', () => {
    tempDir = createTempDir();
    createBrownieFile(
      tempDir,
      'EmptyStore',
      'type EmptyStore = { name: string; };'
    );

    expect(() => discoverStores(tempDir!)).toThrow(
      'No stores found in brownie files'
    );
  });

  it('discovers single store', () => {
    tempDir = createTempDir();
    createBrownieFile(
      tempDir,
      'UserStore',
      makeBrownieContent('UserStore', 'name: string;')
    );

    const stores = discoverStores(tempDir);
    expect(stores).toHaveLength(1);
    expect(stores[0]!.name).toBe('UserStore');
    expect(stores[0]!.schemaPath).toContain('UserStore.brownie.ts');
  });

  it('discovers multiple stores from single file', () => {
    tempDir = createTempDir();
    createBrownieFile(
      tempDir,
      'MultiStore',
      makeMultiStoreBrownieContent([
        { name: 'UserStore', fields: 'name: string;' },
        { name: 'SettingsStore', fields: 'theme: string;' },
      ])
    );

    const stores = discoverStores(tempDir);
    expect(stores).toHaveLength(2);
    const names = stores.map((s) => s.name);
    expect(names).toContain('UserStore');
    expect(names).toContain('SettingsStore');
  });

  it('discovers stores from multiple files', () => {
    tempDir = createTempDir();
    createBrownieFile(
      tempDir,
      'UserStore',
      makeBrownieContent('UserStore', 'name: string;')
    );
    createBrownieFile(
      tempDir,
      'SettingsStore',
      makeBrownieContent('SettingsStore', 'theme: string;')
    );

    const stores = discoverStores(tempDir);
    expect(stores).toHaveLength(2);
    const names = stores.map((s) => s.name);
    expect(names).toContain('UserStore');
    expect(names).toContain('SettingsStore');
  });

  it('discovers stores in subdirectories', () => {
    tempDir = createTempDir();
    const subDir = path.join(tempDir, 'stores');
    fs.mkdirSync(subDir);
    createBrownieFile(
      subDir,
      'NestedStore',
      makeBrownieContent('NestedStore', 'value: number;')
    );

    const stores = discoverStores(tempDir);
    expect(stores).toHaveLength(1);
    expect(stores[0]!.name).toBe('NestedStore');
  });

  it('ignores node_modules', () => {
    tempDir = createTempDir();
    const nodeModules = path.join(tempDir, 'node_modules');
    fs.mkdirSync(nodeModules);
    createBrownieFile(
      nodeModules,
      'IgnoredStore',
      makeBrownieContent('IgnoredStore')
    );
    createBrownieFile(tempDir, 'ValidStore', makeBrownieContent('ValidStore'));

    const stores = discoverStores(tempDir);
    expect(stores).toHaveLength(1);
    expect(stores[0]!.name).toBe('ValidStore');
  });

  it('throws on duplicate store names', () => {
    tempDir = createTempDir();
    const subDir = path.join(tempDir, 'sub');
    fs.mkdirSync(subDir);
    createBrownieFile(
      tempDir,
      'DuplicateStore',
      makeBrownieContent('DuplicateStore')
    );
    createBrownieFile(
      subDir,
      'DuplicateStore2',
      makeBrownieContent('DuplicateStore')
    );

    expect(() => discoverStores(tempDir!)).toThrow(
      'Duplicate store names found'
    );
  });

  it('handles double-quoted module name', () => {
    tempDir = createTempDir();
    createBrownieFile(
      tempDir,
      'DoubleQuote',
      `type DoubleQuote = { value: string; };

declare module "@callstack/brownie" {
  interface BrownieStores {
    DoubleQuote: DoubleQuote;
  }
}
`
    );

    const stores = discoverStores(tempDir);
    expect(stores).toHaveLength(1);
    expect(stores[0]!.name).toBe('DoubleQuote');
  });
});
