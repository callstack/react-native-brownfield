import { type PackageAarFlags } from '@rock-js/platform-android';

import { type PublishLocalAarFlags } from '@rock-js/platform-android';
import { type BuildFlags as AppleBuildFlags } from '@rock-js/platform-apple-helpers';

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
  usePrebuiltRnCore?: boolean;
};

export type BrownfieldPackageAndroidOptions = BrownfieldCommonOptions &
  Partial<PackageAarFlags>;
export type BrownfieldPublishAndroidOptions = BrownfieldCommonOptions &
  Partial<PublishLocalAarFlags>;
export type BrownfieldPackageIosOptions = BrownfieldCommonOptions &
  Partial<PackageIosOptions>;

export type BrownfieldAndroidConfig = Partial<PackageAarFlags> &
  Partial<PublishLocalAarFlags>;
export type BrownfieldIosConfig = Partial<PackageIosOptions>;

export type BrownfieldConfig = BrownfieldConfigMetadata &
  BrownfieldCommonOptions &
  BrownfieldAndroidConfig &
  BrownfieldIosConfig & { brownie?: BrownieConfig };
