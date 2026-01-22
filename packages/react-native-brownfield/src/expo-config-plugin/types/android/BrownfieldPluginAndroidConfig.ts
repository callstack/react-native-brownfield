/**
 * Android-specific configuration for brownfield config plugin
 */
export interface BrownfieldPluginAndroidConfig {
  /**
   * The name of the Android library module to create
   * @default "brownfield"
   */
  moduleName?: string;

  /**
   * The package name for the Android library module
   * @default app's package name
   */
  packageName?: string;

  /**
   * Minimum SDK version for the Android library
   * @default 24
   */
  minSdkVersion?: number;

  /**
   * Target SDK version for the Android library
   * @default 35
   */
  targetSdkVersion?: number;

  /**
   * Compile SDK version for the Android library
   * @default 35
   */
  compileSdkVersion?: number;

  /**
   * Whether to include the ReactNativeHostManager helper class
   * @default true
   */
  includeHostManager?: boolean;

  /**
   * Group ID for Maven publishing
   * @default package name
   */
  groupId?: string;

  /**
   * Artifact ID for Maven publishing
   * @default module name
   */
  artifactId?: string;

  /**
   * Version string for Maven publishing
   * @default "0.0.1-local"
   */
  version?: string;
}

/**
 * Android configuration with resolved defaults (all fields required)
 */
export type ResolvedBrownfieldPluginAndroidConfig =
  Required<BrownfieldPluginAndroidConfig>;
