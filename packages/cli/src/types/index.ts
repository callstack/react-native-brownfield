export type BuildPlatform = {
  entryFile: string;
  useNpm?: boolean;
  outputDir?: string;
};

export type Platform = 'ios' | 'android';

export type BundleJSArgs = {
  platform: Platform;
  buildDir: string;
  rootDir: string;
} & BuildPlatform;
