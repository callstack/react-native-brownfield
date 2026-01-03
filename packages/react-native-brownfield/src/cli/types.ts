export type RockOptions = {
  name: string;
  description: string;
  parse?: (args: string) => string;
  value?: string;
}[];
