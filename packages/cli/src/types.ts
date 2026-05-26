import {
  type PackageAarFlags,
} from '@rock-js/platform-android';

import {
  type PublishLocalAarFlags,
} from '@rock-js/platform-android';
import {
  type BuildFlags as AppleBuildFlags,
} from '@rock-js/platform-apple-helpers';

export type BrownfieldCommonOptions = Partial<{
  verbose: boolean;
}>

export type BrownfieldConfigMetadata = Partial<{
  $schema: string;
}>

export interface BrownieConfig {
  kotlin?: string;
  kotlinPackageName?: string;
}

export type BrownfieldPackageAndroidOptions = BrownfieldCommonOptions & Partial<PackageAarFlags>
export type BrownfieldPublishAndroidOptions = BrownfieldCommonOptions & Partial<PublishLocalAarFlags>
export type BrownfieldPackageIosOptions = BrownfieldCommonOptions & Partial<AppleBuildFlags>

export type BrownfieldAndroidConfig = Partial<PackageAarFlags> & Partial<PublishLocalAarFlags>
export type BrownfieldIosConfig = Partial<AppleBuildFlags>

export type BrownfieldConfig =
  & BrownfieldConfigMetadata
  & BrownfieldCommonOptions
  & BrownfieldAndroidConfig
  & BrownfieldIosConfig
  & { brownie?: BrownieConfig };
