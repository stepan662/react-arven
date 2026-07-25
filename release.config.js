import { execSync } from 'node:child_process'

/**
 * The branch semantic-release is running for. In CI we pass it explicitly; when
 * running locally (e.g. `pnpm release:dry`) we fall back to the checked out
 * branch.
 */
const branch =
  process.env.RELEASE_BRANCH ||
  execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()

const STABLE_BRANCH = 'main'
const isPrerelease = branch !== STABLE_BRANCH

/**
 * Prereleases are published from `rc` and are deliberately kept out of the
 * repository: no CHANGELOG entries and no `chore(release)` commits. That keeps
 * `rc` a plain superset of `main`, so promoting it is a conflict-free merge and
 * the CHANGELOG only ever lists stable versions.
 */
const repoPlugins = [
  [
    '@semantic-release/changelog',
    {
      changelogFile: 'CHANGELOG.md',
    },
  ],
]

const commitPlugins = [
  [
    '@semantic-release/git',
    {
      assets: ['CHANGELOG.md', 'lib/package.json'],
      message:
        'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
    },
  ],
]

export default {
  branches: [STABLE_BRANCH, { name: 'rc', prerelease: true }],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ...(isPrerelease ? [] : repoPlugins),
    // `npmPublish: false` — the workflow publishes with provenance after
    // copying the docs into `lib`.
    [
      '@semantic-release/npm',
      {
        pkgRoot: 'lib',
        npmPublish: false,
      },
    ],
    ...(isPrerelease ? [] : commitPlugins),
    '@semantic-release/github',
  ],
}
