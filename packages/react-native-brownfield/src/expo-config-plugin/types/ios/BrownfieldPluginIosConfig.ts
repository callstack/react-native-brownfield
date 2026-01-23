/**
 * iOS-specific configuration for Brownfield config plugin
 */
export interface BrownfieldPluginIosConfig {
  /**
   * The name of the framework to create
   * This will be used as the XCFramework name
   * @default "App"
   */
  frameworkName?: string;

  /**
   * The bundle identifier for the framework
   * @default app's bundle identifier with ".brownfield" suffix
   */
  bundleIdentifier?: string;

  /**
   * Custom build settings to apply to the framework build
   */
  buildSettings?: Record<string, string | boolean | number>;

  /**
   * Minimum iOS deployment target
   * @default "15.0"
   */
  deploymentTarget?: string;

  /**
   * The version of the framework, must be an integer or floating point (e.g. 1, or 2.1)
   * @default 1
   * @see https://developer.apple.com/documentation/xcode/build-settings-reference#Current-Project-Version
   */
  frameworkVersion?: string;
}

/**
 * iOS configuration with resolved defaults (all fields required)
 */
export type ResolvedBrownfieldPluginIosConfig =
  Required<BrownfieldPluginIosConfig>;
