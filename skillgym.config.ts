import type { SkillGymConfig } from "skillgym";

const config: SkillGymConfig = {
  run: {
    cwd: ".",
    outputDir: "./.skillgym-results",
    reporter: "standard",
    schedule: "parallel",
  },
  defaults: {
    timeoutMs: 300_000,
  },
  runners: {
    "cursor-main": {
      agent: {
        type: "cursor-agent",
        model: "composer-2",
      },
    },
  },
};

export default config;
