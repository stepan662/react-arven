#!/usr/bin/env node
/**
 * Runs semantic-release in dry-run mode and renders a markdown summary of the
 * release the current branch would produce.
 *
 * In CI this runs on the pull request's merge commit checked out under the base
 * branch name, so the preview answers "what version does merging this PR cut?".
 *
 * The markdown goes to stdout (and to $GITHUB_STEP_SUMMARY when set);
 * semantic-release's own logs go to stderr so stdout stays clean.
 */
import { appendFileSync } from 'node:fs'
import semanticRelease from 'semantic-release'

import { distTagFor } from './npm-dist-tag.mjs'

const MARKER = '<!-- release-dry-run -->'
const HEADING = '### 📦 Release preview'

/**
 * semantic-release reads the branch from the CI environment, and on a pull
 * request that is the *source* branch — which no release config matches. Hiding
 * the GitHub Actions markers makes it fall back to the checked out branch,
 * which the workflow has already named after the pull request's base branch.
 */
const env = { ...process.env, GIT_ASKPASS: 'echo', GIT_TERMINAL_PROMPT: '0' }
delete env.GITHUB_ACTIONS

const run = async () => {
  try {
    return {
      release: await semanticRelease(
        {
          dryRun: true,
          // Not a real release run: don't let the CI environment veto it.
          ci: false,
          // Only the plugins needed to work out the version and the notes;
          // `branches` is left to release.config.js so prerelease channels keep
          // their semantics.
          plugins: [
            '@semantic-release/commit-analyzer',
            '@semantic-release/release-notes-generator',
          ],
        },
        { env, stdout: process.stderr, stderr: process.stderr },
      ),
    }
  } catch (error) {
    return { error }
  }
}

const render = ({ release, error }) => {
  if (error) {
    return [
      MARKER,
      HEADING,
      '',
      "Couldn't work out the next version — see the workflow logs.",
      '',
      '```',
      String(error.message).trim(),
      '```',
    ].join('\n')
  }

  if (!release) {
    return [
      MARKER,
      HEADING,
      '',
      'No release would be triggered — nothing since the last release bumps the version.',
      '',
      'Use `feat:` / `fix:` commits (or `BREAKING CHANGE:` in the body) to cut one.',
    ].join('\n')
  }

  const { version, gitTag, notes, channel } = release.nextRelease
  const distTag = distTagFor(version)

  return [
    MARKER,
    HEADING,
    '',
    `Merging this pull request releases **\`react-arven@${version}\`** on the \`${distTag}\` npm tag.`,
    '',
    '| | |',
    '| --- | --- |',
    `| Version | \`${version}\` |`,
    `| Git tag | \`${gitTag}\` |`,
    `| npm | \`npm i react-arven@${channel ? distTag : version}\` |`,
    '',
    '<details><summary>Release notes</summary>',
    '',
    notes?.trim() || '_none_',
    '',
    '</details>',
  ].join('\n')
}

const markdown = render(await run())

console.log(markdown)

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`)
}
