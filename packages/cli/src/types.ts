import type {
  PublishLocalAarFlags,
  PackageAarFlags,
} from '@rock-js/platform-android';
import type { BuildFlags as AppleBuildFlags } from '@rock-js/platform-apple-helpers';

export type Platform = 'swift' | 'kotlin';

export type BrownfieldCommonOptions = Partial<{
  /**
   * Enables verbose CLI logging.
   */
  verbose: boolean;
}>;

export type BrownfieldConfigMetadata = Partial<{
  $schema: string;
}>;

export type BrownieConfig = {
  /**
   * The output path to generate Kotlin Brownie store files at.
   */
  kotlin?: string;

  /**
   * The package name for the Kotlin source code.
   */
  kotlinPackageName?: string;
};

export type PackageIosOptions = Omit<AppleBuildFlags, 'archive' | 'local'> & {
  /** Set when `--use-prebuilt-rn-core` is passed; omitted when the flag is absent (Rock applies RN version defaults). */
  usePrebuiltRnCore?: boolean;

  /** Set when `--use-prebuilt-expo` is passed; omitted when the flag is absent (Rock applies Expo version defaults). */
  usePrebuiltExpo?: boolean;

  /** When set, generate a local Swift Package Manager manifest next to the packaged XCFramework outputs. */
  addSpmPackage?: boolean;
};

export type BrownfieldPackageAndroidOptions = BrownfieldCommonOptions &
  Partial<PackageAarFlags>;
export type BrownfieldPublishAndroidOptions = BrownfieldCommonOptions &
  Partial<PublishLocalAarFlags>;
export type BrownfieldPackageIosOptions = BrownfieldCommonOptions &
  Partial<PackageIosOptions>;

/**
 * Expo config plugin options for Android prebuild scaffolding.
 */
export type BrownfieldExpoAndroidConfig = {
  /**
   * The package name for the Android library module.
   */
  packageName?: string;

  /**
   * Toggle minification for the generated Android library.
   */
  minifyEnabled?: boolean;

  /**
   * Extra Proguard rules appended to the default rules.
   */
  extraProguardRules?: string[];

  /**
   * Minimum SDK version for the Android library.
   */
  minSdkVersion?: number;

  /**
   * Target SDK version for the Android library.
   */
  targetSdkVersion?: number;

  /**
   * Compile SDK version for the Android library.
   */
  compileSdkVersion?: number;

  /**
   * Maven group ID used when publishing the AAR.
   */
  groupId?: string;

  /**
   * Maven artifact ID used when publishing the AAR.
   */
  artifactId?: string;

  /**
   * Maven version used when publishing the AAR.
   */
  version?: string;

  /**
   * When true, load the Brownfield Gradle plugin from
   * `@callstack/react-native-brownfield/gradle-plugin/brownfield` via
   * `includeBuild` instead of adding the Maven classpath dependency.
   * Disabled by default.
   */
  useLocalGradlePlugin?: boolean;

  /**
   * When true, prefer artifacts from the local Maven repository
   * when resolving the Brownfield plugin dependencies.
   * Disabled by default.
   */
  useLocalMaven?: boolean;

  /**   
   * Missing dimension strategies as dimension + flavor(s), e.g. "type, alpha".
   */
  missingDimensionStrategies?: string[];
};

/**
 * Expo config plugin options for iOS prebuild scaffolding.
 */
export type BrownfieldExpoIosConfig = {
  /**
   * The bundle identifier for the framework.
   */
  bundleIdentifier?: string;

  /**
   * Custom build settings applied when building the framework.
   */
  buildSettings?: Record<string, string | boolean | number>;

  /**
   * Minimum iOS deployment target for the generated framework.
   */
  deploymentTarget?: string;

  /**
   * Framework version used for Apple build settings.
   */
  frameworkVersion?: string;
};

export type BrownfieldAndroidConfig = Omit<
  Partial<PackageAarFlags> & Partial<PublishLocalAarFlags>,
  keyof BrownfieldCommonOptions
> & {
  /**
   * Expo config plugin options for Android Expo prebuild phase.
   */
  expo?: BrownfieldExpoAndroidConfig;
};

export type BrownfieldIosConfig = Omit<
  Partial<PackageIosOptions>,
  keyof BrownfieldCommonOptions
> & {
  /**
   * Expo config plugin options for iOS Expo prebuild phase.
   */
  expo?: BrownfieldExpoIosConfig;
};

export type BrownfieldConfig = BrownfieldConfigMetadata &
  BrownfieldCommonOptions &
  Partial<{
    /**
     * Brownfield Android configuration.
     */
    android: BrownfieldAndroidConfig;

    /**
     * Brownfield iOS configuration.
     */
    ios: BrownfieldIosConfig;

    /**
     * Brownie (state library) configuration.
     */
    brownie: BrownieConfig;
  }>;
