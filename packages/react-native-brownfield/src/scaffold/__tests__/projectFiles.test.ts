import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  BROWNFIELD_CLI_PACKAGE_NAME,
  BROWNFIELD_RUNTIME_PACKAGE_NAME,
  addBrownfieldDependencies,
  addBrownfieldPackageScripts,
  createBrownfieldFileConfig,
  writeBrownfieldFileConfig,
} from '../projectFiles';

// Mirrors packages/cli/src/config.ts: the emitted config must validate against
// the schema the CLI itself enforces (schema.json is generated from
// packages/cli/src/types.ts via `yarn generate:schema`). ajv is resolved from
// packages/cli, where it is a declared dependency and the same version the CLI
// validates with, so this test adds no dependency of its own.
const cliPackageRoot = path.resolve(__dirname, '../../../../cli');
const cliRequire = createRequire(path.join(cliPackageRoot, 'package.json'));
// ajv v8 CJS: module.exports is the class itself. Typed loosely on purpose:
// the hoisted `ajv` type declarations in this package may differ from the v8
// copy packages/cli actually validates with; only the compiled validator
// surface is used here.
const Ajv = cliRequire('ajv') as new (options?: Record<string, unknown>) => {
  compile(schema: unknown): (data: unknown) => boolean;
};
const cliSchema = cliRequire('./schema.json');

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validateConfig = ajv.compile(cliSchema);

describe('scaffold project.json file helpers', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'react-native-brownfield-scaffold-')
    );
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  function writePackageJson(pkg: Record<string, unknown>) {
    fs.writeFileSync(
      path.join(projectRoot, 'package.json'),
      JSON.stringify(pkg, null, 2) + '\n',
      'utf8'
    );
  }

  function readPackageJson(): any {
    return JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    );
  }

  describe('addBrownfieldDependencies', () => {
    it('adds the runtime package as a dependency when absent', () => {
      writePackageJson({ name: 'app', dependencies: { react: '19.2.3' } });

      addBrownfieldDependencies(projectRoot);

      const pkg = readPackageJson();
      expect(pkg.dependencies[BROWNFIELD_RUNTIME_PACKAGE_NAME]).toBe('^5.1.1');
      expect(pkg.dependencies.react).toBe('19.2.3');
    });

    it('adds the brownfield CLI as a dependency when absent', () => {
      writePackageJson({ name: 'app' });

      addBrownfieldDependencies(projectRoot);

      const pkg = readPackageJson();
      expect(pkg.dependencies[BROWNFIELD_CLI_PACKAGE_NAME]).toBe('^5.1.1');
    });

    it('leaves existing versions untouched', () => {
      writePackageJson({
        name: 'app',
        dependencies: {
          [BROWNFIELD_RUNTIME_PACKAGE_NAME]: 'file:../local-fork',
        },
        devDependencies: {
          [BROWNFIELD_CLI_PACKAGE_NAME]: 'workspace:^',
        },
      });

      addBrownfieldDependencies(projectRoot);

      const pkg = readPackageJson();
      expect(pkg.dependencies[BROWNFIELD_RUNTIME_PACKAGE_NAME]).toBe(
        'file:../local-fork'
      );
      expect(pkg.devDependencies[BROWNFIELD_CLI_PACKAGE_NAME]).toBe(
        'workspace:^'
      );
      // Must not also appear in the other section.
      expect(
        pkg.devDependencies[BROWNFIELD_RUNTIME_PACKAGE_NAME]
      ).toBeUndefined();
      expect(pkg.dependencies[BROWNFIELD_CLI_PACKAGE_NAME]).toBeUndefined();
    });

    it('is idempotent and byte-stable across runs', () => {
      writePackageJson({ name: 'app', dependencies: { react: '19.2.3' } });

      addBrownfieldDependencies(projectRoot);
      const first = fs.readFileSync(
        path.join(projectRoot, 'package.json'),
        'utf8'
      );

      addBrownfieldDependencies(projectRoot);
      const second = fs.readFileSync(
        path.join(projectRoot, 'package.json'),
        'utf8'
      );

      expect(second).toBe(first);
    });

    it('creates the dependencies section when the package.json has none', () => {
      writePackageJson({ name: 'app', version: '1.0.0' });

      addBrownfieldDependencies(projectRoot);

      const pkg = readPackageJson();
      expect(Object.keys(pkg.dependencies).sort()).toEqual(
        [BROWNFIELD_CLI_PACKAGE_NAME, BROWNFIELD_RUNTIME_PACKAGE_NAME].sort()
      );
    });
  });

  describe('addBrownfieldPackageScripts', () => {
    it('adds package:ios and package:android scripts', () => {
      writePackageJson({
        name: 'app',
        scripts: { start: 'react-native start' },
      });

      addBrownfieldPackageScripts(projectRoot);

      const pkg = readPackageJson();
      expect(pkg.scripts['package:ios']).toBe('brownfield package:ios');
      expect(pkg.scripts['package:android']).toBe('brownfield package:android');
      expect(pkg.scripts.start).toBe('react-native start');
    });

    it('does not clobber existing scripts with the same name', () => {
      writePackageJson({
        name: 'app',
        scripts: { 'package:ios': 'my-custom-packaging' },
      });

      addBrownfieldPackageScripts(projectRoot);

      expect(readPackageJson().scripts['package:ios']).toBe(
        'my-custom-packaging'
      );
    });

    it('is idempotent and byte-stable across runs', () => {
      writePackageJson({ name: 'app' });

      addBrownfieldPackageScripts(projectRoot);
      const first = fs.readFileSync(
        path.join(projectRoot, 'package.json'),
        'utf8'
      );

      addBrownfieldPackageScripts(projectRoot);
      expect(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
      ).toBe(first);
    });
  });

  describe('createBrownfieldFileConfig', () => {
    it('matches the docs manual-step shape and passes the CLI schema', () => {
      const config = createBrownfieldFileConfig({
        iosFrameworkName: 'BrownfieldLib',
        androidModuleName: 'brownfieldlib',
      });

      expect(config).toEqual({
        $schema:
          'https://oss.callstack.com/react-native-brownfield/schema.json',
        ios: {
          scheme: 'BrownfieldLib',
          configuration: 'Release',
        },
        android: {
          moduleName: 'brownfieldlib',
          variant: 'Release',
        },
      });

      expect(validateConfig(config)).toBe(true);
    });

    it('reflects custom framework and module names', () => {
      const config = createBrownfieldFileConfig({
        iosFrameworkName: 'MyLib',
        androidModuleName: 'mylib',
      });

      expect(validateConfig(config)).toBe(true);
      expect(config.ios?.scheme).toBe('MyLib');
      expect(config.android?.moduleName).toBe('mylib');
    });
  });

  describe('writeBrownfieldFileConfig', () => {
    it('writes brownfield.config.json deterministically at the project root', () => {
      writePackageJson({ name: 'app' });
      const configPath = path.join(projectRoot, 'brownfield.config.json');
      const target = writeBrownfieldFileConfig(projectRoot, {
        iosFrameworkName: 'BrownfieldLib',
        androidModuleName: 'brownfieldlib',
      });

      expect(target).toBe(configPath);
      const first = fs.readFileSync(configPath, 'utf8');
      expect(JSON.parse(first)).toEqual(
        createBrownfieldFileConfig({
          iosFrameworkName: 'BrownfieldLib',
          androidModuleName: 'brownfieldlib',
        })
      );

      const again = writeBrownfieldFileConfig(projectRoot, {
        iosFrameworkName: 'BrownfieldLib',
        androidModuleName: 'brownfieldlib',
      });
      expect(again).toBe(configPath);
      expect(fs.readFileSync(configPath, 'utf8')).toBe(first);
    });

    it('overwrites a stale config with the deterministic derived content', () => {
      writePackageJson({ name: 'app' });
      const target = path.join(projectRoot, 'brownfield.config.json');
      fs.writeFileSync(target, '{"ios":{"scheme":"OldName"}}', 'utf8');

      writeBrownfieldFileConfig(projectRoot, {
        iosFrameworkName: 'BrownfieldLib',
        androidModuleName: 'brownfieldlib',
      });

      expect(JSON.parse(fs.readFileSync(target, 'utf8')).ios.scheme).toBe(
        'BrownfieldLib'
      );
    });

    it('does not write a json config when a js config already exists', () => {
      // packages/cli loadBrownfieldConfig errors on multiple config files.
      fs.writeFileSync(
        path.join(projectRoot, 'brownfield.config.js'),
        'module.exports = {};',
        'utf8'
      );

      writeBrownfieldFileConfig(projectRoot, {
        iosFrameworkName: 'BrownfieldLib',
        androidModuleName: 'brownfieldlib',
      });

      expect(
        fs.existsSync(path.join(projectRoot, 'brownfield.config.json'))
      ).toBe(false);
    });

    it('does not write a json config when package.json carries a legacy brownfield key', () => {
      writePackageJson({ name: 'app', brownfield: { ios: { scheme: 'Lib' } } });

      writeBrownfieldFileConfig(projectRoot, {
        iosFrameworkName: 'BrownfieldLib',
        androidModuleName: 'brownfieldlib',
      });

      expect(
        fs.existsSync(path.join(projectRoot, 'brownfield.config.json'))
      ).toBe(false);
    });
  });
});
