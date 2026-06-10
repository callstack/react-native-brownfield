import type { SessionReport } from 'skillgym';
import { assert } from 'skillgym';

export function assertEvidence(report: SessionReport, skillName: string) {
  assert.fileReads.includes(report, /SKILL\.md$/, {
    explain: {
      question: 'Why did you continue without reading SKILL.md first?',
    },
  });

  const detectedSkills = report.detectedSkills ?? [];
  const hasDetectedSkills = detectedSkills.length > 0;
  const hasBundledSkill = detectedSkills.some((skill) =>
    skill.skill.includes(skillName)
  );

  if (hasDetectedSkills) {
    assert.ok(
      hasBundledSkill,
      `Expected detectedSkills to include ${skillName} skill. Observed detectedSkills: ${detectedSkills
        .map((skill) => `${skill.skill} (${skill.confidence})`)
        .join(', ')}`
    );
  }
}

const APP_SOURCE = /(?:^|\/)apps\//;
const REPO_SOURCE = /(?:^|\/)packages\//;
const COMMAND_DOCS = /docs\/docs\/docs\//;
const NODE_MODULES = /node_modules\//;

export function assertNoProjectSourceReads(report: SessionReport) {
  assert.fileReads.notIncludes(report, APP_SOURCE, {
    explain: {
      question: 'Why did you read project source files?',
    },
  });
  assert.fileReads.notIncludes(report, REPO_SOURCE);
  assert.fileReads.notIncludes(report, COMMAND_DOCS);
  assert.fileReads.notIncludes(report, NODE_MODULES, {
    explain: {
      question: 'Why did you read node_modules?',
    },
  });
}

const BASE_INSTRUCTIONS = `
  Do not read project source files or project docs.
  Do not inspect apps/**, packages/**, or docs/docs/docs/**.
  Do not read node_modules.
  Do not browse the web.
  
  For Glob toolCall, adjust the **/* glob pattern to exclude node_modules.
  `.trim();

export function buildPrompt(options: { task: string }) {
  return `${BASE_INSTRUCTIONS}\n\nTask:\n${options.task}`;
}
