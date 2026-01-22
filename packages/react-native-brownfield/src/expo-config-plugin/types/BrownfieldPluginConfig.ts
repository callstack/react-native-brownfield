import type {
  BrownfieldPluginAndroidConfig,
  ResolvedBrownfieldPluginAndroidConfig,
} from './android/BrownfieldPluginAndroidConfig';
import type {
  BrownfieldPluginIosConfig,
  ResolvedBrownfieldPluginIosConfig,
} from './ios/BrownfieldPluginIosConfig';

/**
 * Main configuration for the brownfield Expo config plugin
 */
export interface BrownfieldPluginConfig {
  /**
   * iOS-specific configuration
   */
  ios?: BrownfieldPluginIosConfig;

  /**
   * Android-specific configuration
   */
  android?: BrownfieldPluginAndroidConfig;

  /**
   * Whether to enable debug logging during plugin execution
   * @default false
   */
  debug?: boolean;
}

/**
 * Internal configuration with resolved defaults
 * Note that the platform-specific configs can be null if the platform is not configured
 */
export interface ResolvedBrownfieldPluginConfig extends Required<
  Omit<BrownfieldPluginConfig, 'ios' | 'android'>
> {
  /**
   * iOS-specific configuration
   */
  ios: ResolvedBrownfieldPluginIosConfig | null;

  /**
   * Android-specific configuration
   */
  android: ResolvedBrownfieldPluginAndroidConfig | null;
}

/**
 * Resolved brownfield configuration including Android config
 */
export interface ResolvedBrownfieldPluginConfigWithAndroid extends ResolvedBrownfieldPluginConfig {
  /**
   * Android-specific configuration
   */
  android: ResolvedBrownfieldPluginAndroidConfig;
}

/**
 * Resolved brownfield configuration including iOS config
 */
export interface ResolvedBrownfieldPluginConfigWithIos extends ResolvedBrownfieldPluginConfig {
  /**
   * iOS-specific configuration
   */
  ios: ResolvedBrownfieldPluginIosConfig;
}
