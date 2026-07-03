import type { BrownfieldConfig } from './types.js';

export { loadBrownfieldConfig } from './config.js';

/**
 * Legacy Expo config plugin props shape accepted via app.json plugins tuple.
 */
export type BrownfieldPluginProps = {
  debug?: boolean;
  ios?: {
    frameworkName?: string;
    bundleIdentifier?: string;
    buildSettings?: Record<string, string | boolean | number>;
    deploymentTarget?: string;
    frameworkVersion?: string;
  };
  android?: {
    moduleName?: string;
    packageName?: string;
    minSdkVersion?: number;
    targetSdkVersion?: number;
    compileSdkVersion?: number;
    groupId?: string;
    artifactId?: string;
    version?: string;
    useLocalGradlePlugin?: boolean;
  };
};

export type ResolvedBrownfieldPluginAndroidConfig = {
  moduleName: string;
  packageName: string;
  minSdkVersion: number;
  targetSdkVersion: number;
  compileSdkVersion: number;
  groupId: string;
  artifactId: string;
  version: string;
  useLocalGradlePlugin: boolean;
};

export type ResolvedBrownfieldPluginIosConfig = {
  frameworkName: string;
  bundleIdentifier: string;
  buildSettings: Record<string, string | boolean | number>;
  deploymentTarget: string;
  frameworkVersion: string;
};

export type ResolvedBrownfieldPluginConfig = {
  debug: boolean;
  ios: ResolvedBrownfieldPluginIosConfig | null;
  android: ResolvedBrownfieldPluginAndroidConfig | null;
};

type BrownfieldExpoConfig = {
  ios?: {
    bundleIdentifier?: string;
  };
  android?: {
    package?: string;
  };
};

const CONFIG_FILE_PLUGIN_OVERLAP_ERROR =
  'Brownfield configuration is defined in both a brownfield config file and app.json plugin options. ' +
  'Use only one source: either brownfield.config.js, brownfield.config.json, package.json#brownfield, or the plugin options in app.json.';

/**
 * Checks if the plugin props are non-empty.
 * @param props - The plugin props to check.
 * @returns True if the plugin props are non-empty, false otherwise.
 */
function isPluginPropsNonEmpty(props: BrownfieldPluginProps): boolean {
  if (props.debug !== undefined) {
    return true;
  }

  if (props.ios && Object.keys(props.ios).length > 0) {
    return true;
  }

  if (props.android && Object.keys(props.android).length > 0) {
    return true;
  }

  return false;
}

/**
 * Converts the file config to plugin props.
 * @param fileConfig - The file config to convert to plugin props.
 * @returns The plugin props.
 */
function fileConfigToPluginProps(
  fileConfig: BrownfieldConfig
): BrownfieldPluginProps {
  const props: BrownfieldPluginProps = {};

  if (fileConfig.verbose !== undefined) {
    props.debug = fileConfig.verbose;
  }

  if (fileConfig.android) {
    props.android = {
      moduleName: fileConfig.android.moduleName,
      ...fileConfig.android.expo,
    };
  }

  if (fileConfig.ios) {
    props.ios = {
      frameworkName: fileConfig.ios.scheme,
      ...fileConfig.ios.expo,
    };
  }

  return props;
}

/**
 * Asserts that there is no overlap between the file config and the plugin props.
 * @param fileConfig - The loaded file config, or null when no config source exists.
 * @param pluginProps - The plugin props to check for overlap.
 * @throws An error if there is overlap.
 * @returns void
 */
export function assertNoConfigFilePluginOverlap(
  fileConfig: BrownfieldConfig | null,
  pluginProps: BrownfieldPluginProps
): void {
  if (fileConfig === null) {
    return;
  }

  if (isPluginPropsNonEmpty(pluginProps)) {
    throw new Error(CONFIG_FILE_PLUGIN_OVERLAP_ERROR);
  }
}

/**
 * Resolves the plugin config from the file config and the plugin props.
 * @param pluginProps - The plugin props to resolve.
 * @param fileConfig - The file config to resolve.
 * @param expoConfig - The Expo plugin config to resolve.
 * @returns The resolved plugin config.
 */
export function resolveBrownfieldPluginConfig(
  pluginProps: BrownfieldPluginProps,
  fileConfig: BrownfieldConfig | null,
  expoConfig: BrownfieldExpoConfig
): ResolvedBrownfieldPluginConfig {
  const effectiveProps =
    fileConfig !== null ? fileConfigToPluginProps(fileConfig) : pluginProps;

  const androidPackage = expoConfig.android?.package;
  /**
   * Below: android.moduleName may be provided in the fully-qualified Gradle format
   * (e.g. :BrownfieldLib — this is shown in the CLI example usage).
   * The Expo prebuild side expects a raw module folder/name (it later
   * prepends : itself and uses it as a path), so a leading : is removed.
   */
  const androidModuleName = (
    effectiveProps.android?.moduleName ?? 'brownfieldlib'
  ).replace(/^:/, '');

  return {
    debug: effectiveProps.debug ?? false,
    ios: expoConfig.ios
      ? {
          frameworkName: effectiveProps.ios?.frameworkName ?? 'BrownfieldLib',
          bundleIdentifier:
            effectiveProps.ios?.bundleIdentifier ??
            `${expoConfig.ios.bundleIdentifier}.brownfield`,
          buildSettings: effectiveProps.ios?.buildSettings ?? {},
          deploymentTarget: effectiveProps.ios?.deploymentTarget ?? '15.0',
          frameworkVersion: effectiveProps.ios?.frameworkVersion ?? '1',
        }
      : null,
    android: androidPackage
      ? {
          moduleName: androidModuleName,
          packageName: effectiveProps.android?.packageName ?? androidPackage,
          minSdkVersion: effectiveProps.android?.minSdkVersion ?? 24,
          targetSdkVersion: effectiveProps.android?.targetSdkVersion ?? 35,
          compileSdkVersion: effectiveProps.android?.compileSdkVersion ?? 35,
          groupId: effectiveProps.android?.groupId ?? androidPackage,
          artifactId: effectiveProps.android?.artifactId ?? androidModuleName,
          version: effectiveProps.android?.version ?? '0.0.1-SNAPSHOT',
          useLocalGradlePlugin:
            effectiveProps.android?.useLocalGradlePlugin ?? false,
        }
      : null,
  };
}
