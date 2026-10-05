# AGENTS.md

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md). It covers setup, scripts, tests, E2E and publishing for this monorepo, and it wins if anything here disagrees with it.

## Repository basics

- Yarn 4 workspaces with Turbo. Run `yarn` at the root to install.
- Packages live in `packages/`, example and host apps in `apps/`, and the Android Gradle plugin in `gradle-plugins/`.
- Every PR that changes a published package needs a changeset (`yarn changeset`). CI handles versioning and npm publishing.
- Commit messages follow Conventional Commits. A `commitlint` hook checks them.

## Skills

- `.claude/skills/` holds skills for working on this repo. For example, `publish-new-npm-package` walks through the first manual publish of a new package. Claude Code loads them on its own. Other agents should read the `SKILL.md` that matches the task.
- `skills/` holds skills for people using the libraries in their apps (`brownie`, `brownfield-navigation`). They are not about maintaining this repo.
