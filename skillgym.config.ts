import type { SkillGymConfig } from "skillgym";

const config: SkillGymConfig = {
  run: {
    cwd: ".",
    outputDir: "./.skillgym-results",
    reporter: "standard",
    schedule: "isolated-by-runner",
  },
  defaults: {
    timeoutMs: 120_000,
  },
  runners: {
    "cursor-main": {
      agent: {
        type: "cursor-agent",
        model: "composer-2-fast",
      },
    },
  },
};

export default config;