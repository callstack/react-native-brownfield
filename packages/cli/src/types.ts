import type {
  PublishLocalAarFlags,
  PackageAarFlags,
} from '@rock-js/platform-android';
import type { BuildFlags as AppleBuildFlags } from '@rock-js/platform-apple-helpers';

export type Platform = 'swift' | 'kotlin';

export type BrownfieldCommonOptions = Partial<{
  verbose: boolean;
}>;

export type BrownfieldConfigMetadata = Partial<{
  $schema: string;
}>;

export type BrownieConfig = {
  kotlin?: string;
  kotlinPackageName?: string;
};

export type PackageIosOptions = AppleBuildFlags & {
  /** Set when `--use-prebuilt-rn-core` is passed; omitted when the flag is absent (Rock applies RN version defaults). */
  usePrebuiltRnCore?: boolean;
  /** When set, generate a local Swift Package Manager manifest next to the packaged XCFramework outputs. */
  addSpmPackage?: boolean;
};

export type BrownfieldPackageAndroidOptions = BrownfieldCommonOptions &
  Partial<PackageAarFlags>;
export type BrownfieldPublishAndroidOptions = BrownfieldCommonOptions &
  Partial<PublishLocalAarFlags>;
export type BrownfieldPackageIosOptions = BrownfieldCommonOptions &
  Partial<PackageIosOptions>;

export type BrownfieldAndroidConfig = Omit<
  Partial<PackageAarFlags> & Partial<PublishLocalAarFlags>,
  keyof BrownfieldCommonOptions
>;
export type BrownfieldIosConfig = Omit<
  Partial<PackageIosOptions>,
  keyof BrownfieldCommonOptions
>;

export type BrownfieldConfig = BrownfieldConfigMetadata &
  BrownfieldCommonOptions &
  Partial<{
    android: BrownfieldAndroidConfig;
    ios: BrownfieldIosConfig;
    brownie: BrownieConfig;
  }>;
