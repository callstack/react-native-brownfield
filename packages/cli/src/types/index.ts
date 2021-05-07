export type BuildCommandArgs = {
  entryFile: string;
  useNpm?: boolean;
  outputDir?: string;
  verbose?: boolean;
};

export type Platform = 'ios' | 'android';
