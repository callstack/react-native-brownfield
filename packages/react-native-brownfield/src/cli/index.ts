#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs';

import loadConfig from '@react-native-community/cli-config/build/loadConfig';
import { projectConfig } from '@react-native-community/cli-config-android';

import { spinner, intro, logger, outro } from '@rock-js/tools';
import {
  packageAar,
  packageAarOptions,
  publishLocalAar,
  publishLocalAarOptions,
} from '@rock-js/platform-android';
import { mergeFrameworks } from '@rock-js/platform-apple-helpers';

import { Command } from 'commander';

import {
  curryOptions,
  executeCommand,
  findProjectRoot,
  getAarConfig,
  makeRelativeAndroidProjectConfigPaths,
} from './utils';
import { version } from '../../package.json';

const program = new Command();

program
  .name('react-native-brownfield')
  .description('React Native Brownfield library CLI')
  .version(version)
  .option('--verbose', 'Enable verbose output')
  .hook('preAction', (_cmd) => {
    const opts = program.opts();
    if (opts.verbose) {
      logger.setVerbose(opts.verbose ?? false);
    }
  });

function commonAndroidPackageConfigParser<T>(
  projectRoot: string,
  options: any,
  callback: (config: ReturnType<typeof getAarConfig>) => T
): T {
  if (!options.moduleName) {
    logger.warn(
      'No module name specified, packaging from root project. Usually, this is not what you want; if this fails, specify --module-name to target a specific module.'
    );
  }

  logger.debug('Project root found at:', projectRoot);

  const userConfig = loadConfig({ projectRoot, selectedPlatform: 'android' });

  logger.debug('RN CLI user config loaded:', userConfig);

  const androidConfig = projectConfig(
    projectRoot,
    makeRelativeAndroidProjectConfigPaths(
      projectRoot,
      userConfig.project.android
    )
  );

  logger.debug('Android user config loaded:', userConfig);

  if (androidConfig) {
    const config = getAarConfig(options, androidConfig);
    return callback(config);
  } else {
    throw new Error('Android project not found.');
  }
}

curryOptions(
  program.command('package:android').description('Build Android package'),
  packageAarOptions
).action(async (options) => {
  const projectRoot = findProjectRoot();

  intro(
    `Building Android package ${options.moduleName ? `for module '${options.moduleName}'` : 'from root project'}...`
  );

  await commonAndroidPackageConfigParser(projectRoot, options, (config) =>
    packageAar(config, options)
  );
});

curryOptions(
  program
    .command('publish:android')
    .description('Publish Android package to Maven local'),
  publishLocalAarOptions
).action(async (options) => {
  const projectRoot = findProjectRoot();

  intro(
    `Publishing Android package to Maven local ${options.moduleName ? `for module '${options.moduleName}'` : 'from root project'}...`
  );

  await commonAndroidPackageConfigParser(projectRoot, options, (config) =>
    publishLocalAar(config)
  );
});

curryOptions(program.command('package:ios').description('Build iOS package'), [
  {
    name: '--workspace <workspace>',
    description: 'The Xcode workspace to build',
  },
  {
    name: '--target <target>',
    description: 'The Xcode target to build',
  },
  {
    name: '--build-folder <folder>',
    description: 'The build folder to use',
  },
  {
    name: '--scheme <scheme>',
    description: 'The Xcode scheme to build',
  },
  {
    name: '--configuration <configuration>',
    description: 'The build configuration to use (Debug/Release)',
    value: 'Debug',
  },
  {
    name: '--sdk <sdk>',
    description: 'The SDK to build for (iphoneos/iphonesimulator)',
    value: 'iphoneos,iphonesimulator',
  },
  {
    name: '--no-install-pods',
    description: 'Skip installing pods before building',
  },
]).action(async (options) => {
  const projectRoot = findProjectRoot();
  const userConfig = loadConfig({ projectRoot, selectedPlatform: 'ios' });

  const { xcodeProject, sourceDir: iosBaseDir } = userConfig.project.ios!;

  intro(
    `Building iOS package from project '${xcodeProject?.name ?? '(no name configured)'}'...`
  );

  logger.debug('Detected user config:', userConfig);
  logger.debug('Detected Xcode project config:', xcodeProject);

  let scheme = options.scheme;

  if (!scheme) {
    const results = await executeCommand('xcodebuild', ['-list', '-json'], {
      cwd: iosBaseDir,
    });

    let schemes: string[];
    try {
      const parsed = JSON.parse(results.join(' '));
      schemes = parsed!.project!.schemes;
    } catch {
      throw new Error("Couldn't parse xcodebuild output");
    }

    if (schemes.length === 0) {
      throw new Error(
        'No schemes found in the Xcode project. Please specify one using --scheme.'
      );
    }

    scheme = schemes[0];
  }

  const workspace = options.workspace ?? xcodeProject!.name;

  if (!workspace) {
    throw new Error(
      'No workspace specified and could not be inferred from the config. Please specify one using --workspace.'
    );
  }

  let sdks = (
    (Array.isArray(options.sdk) ? options.sdk : [options.sdk]) as string[]
  )
    .flatMap((sdk) => sdk.split(',').map((s) => s.trim()))
    .filter((sdk) => sdk.length > 0);

  if (!options.noInstallPods) {
    const { start, stop, message } = spinner();

    start(`Installing pods...`);

    try {
      message('Installing Gems with bundler...');
      await executeCommand('bundle', ['install'], { cwd: iosBaseDir });

      message('Installing pods with CocoaPods via bundler...');
      await executeCommand('bundle', ['exec', 'pod', 'install'], {
        cwd: iosBaseDir,
        env: {
          ...process.env,
          USE_FRAMEWORKS: 'static',
        },
      });
    } catch (e) {
      logger.debug('Failed to install pods via bundler', e);

      message('Failed to install pods via bundler, trying without it...');

      await executeCommand('pod', ['install'], {
        cwd: iosBaseDir,
        env: {
          ...process.env,
          USE_FRAMEWORKS: 'static',
        },
      });
    }

    stop(`Pods installed successfully.`);
  }

  const { start, stop, message } = spinner();

  start(`Packaging framework for ${sdks.join(', ')}...`);

  const appFrameworkPathsToMerge: string[] = [];

  let i = 1,
    total = sdks.length;
  for (const sdk of sdks) {
    const buildFolder =
      options.buildFolder ??
      path.join(
        iosBaseDir,
        'build',
        `${scheme}-${options.configuration}-${sdk}`
      );

    message(`[${i}/${total}] Building for sdk: ${sdk}`);

    await executeCommand(
      'xcodebuild',
      [
        '-workspace',
        workspace.endsWith('.xcworkspace')
          ? workspace
          : `${workspace}.xcworkspace`,
        '-scheme',
        scheme,
        '-configuration',
        options.configuration,
        '-sdk',
        sdk,
        '-derivedDataPath',
        `${path.relative(iosBaseDir, buildFolder)}`,
        ...(options.target ? ['-target', options.target] : []),
        'build',
        'CODE_SIGNING_ALLOWED=NO',
      ],
      {
        cwd: iosBaseDir,
      }
    );

    appFrameworkPathsToMerge.push(
      path.join(
        buildFolder,
        'Build',
        'Products',
        `${options.configuration}-${sdk}`,
        `${scheme}.framework`
      )
    );

    message(`App lib XCFramework packaged in ${buildFolder}`);
    i++;
  }

  // output artifacts
  const outDir = path.join(iosBaseDir, 'out', options.configuration);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  const artifactNames: string[] = [];

  // merge built artifacts into XCFramework
  {
    message(
      `Merging ${appFrameworkPathsToMerge.length} framework${appFrameworkPathsToMerge.length !== 1 ? 's' : ''} into XCFramework...`
    );

    const artifactName = `${scheme}.xcframework`;
    artifactNames.push(artifactName);
    await mergeFrameworks({
      sourceDir: iosBaseDir,
      frameworkPaths: appFrameworkPathsToMerge,
      outputPath: path.join(outDir, artifactName),
    });
  }

  // copy hermes XCFramework
  {
    const artifactName = 'hermesvm.xcframework';
    artifactNames.push(artifactName);

    const hermesFrameworkSourcePath = path.join(
      iosBaseDir,
      'Pods',
      'hermes-engine',
      'destroot',
      'Library',
      'Frameworks',
      'universal',
      artifactName
    );
    const xcframeworkOutputPath = path.join(outDir, artifactName);

    fs.cpSync(hermesFrameworkSourcePath, xcframeworkOutputPath, {
      recursive: true,
    });
  }

  // merge ReactBrownfield XCFramework
  {
    const artifactName = 'ReactBrownfield.xcframework';
    artifactNames.push(artifactName);
    await mergeFrameworks({
      sourceDir: iosBaseDir,
      frameworkPaths: sdks.map((sdk) =>
        path.join(
          options.buildFolder ??
            path.join(
              iosBaseDir,
              'build',
              `${scheme}-${options.configuration}-${sdk}`
            ),
          'Build',
          'Products',
          `${options.configuration}-${sdk}`,
          'ReactBrownfield',
          'ReactBrownfield.framework'
        )
      ),
      outputPath: path.join(outDir, artifactName),
    });
  }

  stop(`Aritfacts placed in '${outDir}': ${artifactNames.join(', ')}`);

  outro('Success 🎉');
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
