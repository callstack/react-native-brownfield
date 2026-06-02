/**
 * Android-specific configuration for Brownfield config plugin
 */
export interface BrownfieldPluginAndroidConfig {
  /**
   * The name of the Android library module to create
   * @default "brownfieldlib"
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
   * @default 35 for Expo SDK <= 55, 36 for Expo SDK >= 56
   */
  targetSdkVersion?: number;

  /**
   * Compile SDK version for the Android library
   * @default inherited from the generated Expo app project when available
   */
  compileSdkVersion?: number;

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
   * @default "0.0.1-SNAPSHOT"
   */
  version?: string;
}

/**
 * Android configuration with resolved defaults (all fields required)
 */
export type ResolvedBrownfieldPluginAndroidConfig = Required<
  Omit<BrownfieldPluginAndroidConfig, 'compileSdkVersion'>
> &
  Pick<BrownfieldPluginAndroidConfig, 'compileSdkVersion'>;
