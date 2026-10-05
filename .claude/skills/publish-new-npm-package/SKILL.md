---
name: publish-new-npm-package
description: "Trigger: a maintainer needs to publish a package from this monorepo to npm for the first time, set up npm trusted publishing (OIDC) for a package, or a release fails because a package does not exist on npm yet. Guides the manual first publish and trusted publisher setup."
---

## Activation Contract

Use when a workspace package under `packages/` has never been published to npm, when a maintainer asks how to bootstrap trusted publishing for a package, or when the release workflow fails to publish a package npm does not know.

Do not use for regular releases. Those only need a changeset; CI publishes them.

## Hard Rules

- The "Publishing to npm" section of `CONTRIBUTING.md` is the source of truth. Read it in full before acting and follow its steps and order. Do not work from memory or from a copy of the steps.
- If this skill and `CONTRIBUTING.md` disagree, `CONTRIBUTING.md` wins. Tell the maintainer about the mismatch.
- Never run `npm publish` (without `--dry-run`) unless the maintainer has explicitly said to publish that exact package and version. Publishing is irreversible: npm never accepts the same version twice.
- The maintainer runs `npm login` and completes two-factor authentication. Never ask for, read, store, or type OTPs, passwords, or npm tokens.
- Never commit `package.tgz` or any other packed tarball. Delete it after publishing.
- Do not merge the PR that adds the package before the manual publish succeeded.

## Pre-flight Checks

Run these yourself before the maintainer publishes, and report the results:

| Check | Command | Expected |
|-------|---------|----------|
| Logged in | `npm whoami` | The maintainer's npm username |
| Not published yet | `npm view <package-name> version` | `E404`. A version means the first publish already happened; switch to trusted publisher setup. |
| Version matches the fixed group | compare `version` in `packages/<dir>/package.json` with `packages/react-native-brownfield/package.json` | Same version |
| In the fixed group | `.changeset/config.json` | Package name listed under `fixed` |
| Public access | `publishConfig.access` in the package's `package.json` | `public` |
| Tarball clean | after `yarn workspace <package-name> pack`, `tar -xzOf packages/<dir>/package.tgz package/package.json` | No `workspace:` ranges |

If a check fails, stop and tell the maintainer what to fix. Do not fix version numbers or the fixed group without asking.

## Execution Steps

1. Read the "Publishing to npm" section of `CONTRIBUTING.md`.
2. Run the pre-flight checks.
3. Walk the maintainer through the steps in `CONTRIBUTING.md`, running the build, pack and inspection commands when asked.
4. Before the publish step, show the exact command, package name and version, and wait for an explicit go-ahead.
5. The maintainer runs `npm publish` in their own interactive terminal. Your shell is non-interactive, so npm can't wait for the browser approval and fails with `EOTP` without publishing. Do not suggest `--otp`, because the code would end up in the conversation.
6. After the publish, poll `npm view <package-name> versions` until the real version replaces the `0.0.0-stage` placeholder (it took about two minutes the first time). Then delete the tarball and remind the maintainer to configure the trusted publisher once the PR is merged.

## Output Contract

Report each check as `<command>: <result>`, the published version if any, and the steps still left for the maintainer.
