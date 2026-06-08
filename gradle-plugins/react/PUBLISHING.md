# Brownfield Gradle Plugin Publishing

This document covers two different flows:

- local snapshot publishing to `mavenLocal()` for development and CI road tests
- Maven Central release publishing through GitHub Actions and JReleaser

## Source of truth

The Brownfield Gradle Plugin version lives in:

`gradle-plugins/react/brownfield/gradle.properties`

Everything else that embeds the plugin version must be synced from that file. Before preparing a release, run:

```sh
yarn brownfield:plugin:version:check
```

If the check reports drift, sync the versioned references with:

```sh
yarn brownfield:plugin:version:sync
```

## Local snapshot publishing

Use this when you need the plugin in `~/.m2/repository` for local Android work or CI road tests.

```sh
yarn brownfield:plugin:publish:local
```

That command publishes:

- `com.callstack.react:brownfield-gradle-plugin:<version>-SNAPSHOT`
- to `mavenLocal()`
- without Maven Central release steps

The signed local variant remains available if you need to inspect the signed output locally:

```sh
yarn brownfield:plugin:publish:local:signed
```

## Release publishing

Release publishing is automated by:

`/.github/workflows/release-brownfield-gradle-plugin.yml`

The workflow stages Maven artifacts from:

`gradle-plugins/react/brownfield/build/staging-deploy`

and then uses the repo-root `jreleaser.yml` configuration to:

- sign release artifacts
- publish them to Maven Central
- create the GitHub release

### Required GitHub secrets

The workflow expects these repository secrets:

- `JRELEASER_MAVENCENTRAL_USERNAME`
- `JRELEASER_MAVENCENTRAL_PASSWORD`
- `JRELEASER_GPG_PUBLIC_KEY`
- `JRELEASER_GPG_SECRET_KEY`
- `JRELEASER_GPG_PASSPHRASE`

`GITHUB_TOKEN` is provided by GitHub Actions and is used for the GitHub release step.

### Tag-triggered release

The normal release path is a pushed tag that matches:

`brownfield-gradle-plugin/v<version>`

Example:

```sh
git tag brownfield-gradle-plugin/v1.1.0
git push origin brownfield-gradle-plugin/v1.1.0
```

The workflow validates that the tag version matches `gradle-plugins/react/brownfield/gradle.properties`.

### Manual workflow dispatch

Use `workflow_dispatch` when you want to:

- dry-run the release preparation
- publish from a selected ref without pushing the tag first
- retry after fixing workflow or secret issues

Inputs:

- `ref`: git ref to release from, defaults to `main`
- `dry_run`: when `true`, prepare and upload artifacts only

For `workflow_dispatch`, the workflow derives the release tag from the current plugin version as:

`brownfield-gradle-plugin/v{{projectVersion}}`

### What the workflow does

The validation job:

- checks out the requested ref with full history
- runs the shared setup and Android environment actions
- verifies plugin version sync
- generates plugin-scoped release notes
- stages the Maven repository with `publishMavenLocalPublicationToReleaseStagingRepository -PSkipSigning=true`
- uploads the staged Maven repository and release notes as artifacts

The publish job:

- runs automatically on tag pushes
- runs on manual dispatch only when `dry_run` is `false`
- downloads the staged artifacts from the validation job
- runs `jreleaser/release-action@v2`

## Release notes

Plugin release notes are generated with:

```sh
yarn brownfield:plugin:release-notes --version <version> --ref <ref> --output <path>
```

The generator:

- scopes commits to plugin-relevant paths only
- uses the previous plugin tag when available
- handles the existing legacy plugin tag formats in this repository

## No manual Maven Central upload

The old workflow of zipping `~/.m2/repository/com` and uploading it manually to Maven Central is obsolete and should not be used anymore.
