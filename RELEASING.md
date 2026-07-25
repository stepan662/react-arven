# Releasing

Releases are fully automated with [semantic-release](https://semantic-release.gitbook.io/).
Versions come from [conventional commits](https://www.conventionalcommits.org/) —
`fix:` bumps the patch, `feat:` the minor, `BREAKING CHANGE:` in the body the major.

There are two release channels:

| Branch | Version | npm dist-tag | Install |
| --- | --- | --- | --- |
| `main` | `2.2.0` | `latest` | `npm i react-arven` |
| `rc` | `2.2.0-rc.1` | `rc` | `npm i react-arven@rc` |

## Cutting a release candidate

Merge the feature branch into `rc`. Once the `Test` workflow passes, `Release`
publishes `x.y.z-rc.N` under the `rc` dist-tag and creates a GitHub prerelease.
Every following merge into `rc` bumps the `rc.N` counter.

Prereleases deliberately leave no trace in the repository: no CHANGELOG entry and
no `chore(release)` commit are made on `rc` (see [release.config.js](release.config.js)).
That keeps `rc` a plain superset of `main`, so promoting it is a conflict-free merge
and the CHANGELOG only ever lists stable versions.

`npm i react-arven@rc` never reaches anyone installing `react-arven` — the `latest`
tag is what a plain install resolves to.

## Promoting to stable

Merge `rc` into `main`. semantic-release ignores the prerelease tags when it looks
at `main` and cuts the stable version the same commits imply — the `2.2.0-rc.3` on
`rc` becomes `2.2.0` on `main`.

`main` then gets a `chore(release)` commit with the CHANGELOG entry and the bumped
`lib/package.json`, so merge `main` back into `rc` before continuing to work there.

## Not merging into `main` by accident

`main` stays the repository's default branch — it's what the GitHub landing page
renders, and the README there should document what's actually published. A new
pull request therefore arrives with `main` pre-filled as its base, and
[`Guard main`](.github/workflows/guard-main.yml) sorts that out:

- A pull request **opened** against `main` from anything other than `rc` is
  **retargeted at `rc`** and gets a comment saying so. GitHub has no setting for a
  default pull request base, so this stands in for one.
- Setting the base back to `main` by hand **fails the check** — that path is a
  deliberate act, so it wants a deliberate override.
- **Branch protection on `main`** requires a pull request and a green `Guard main`,
  so the failing check can't be clicked past.

To release a branch straight to `latest` anyway — a hotfix, say — add the
`direct-to-main` label. The guard passes and the label records the decision on the
pull request.

Pull requests from forks can't be retargeted (they get a read-only token), so they
fail the check with instructions instead.

## Previewing a release

Every pull request into `main` or `rc` runs [`Release Preview`](.github/workflows/release-preview.yml),
which comments the version, npm dist-tag and release notes that merging would
produce. The dry run happens on the pull request's *merge* commit, so the preview
accounts for whatever has landed on the base branch in the meantime.

Locally:

```bash
pnpm release:dry
```

This reads the checked out branch, so check out `main` or `rc` (or pass
`RELEASE_BRANCH`) to see what that channel would release.

## Publishing a one-off build

For sharing a build that shouldn't live on a branch at all:

```bash
pnpm publish-prerelease
```

This publishes `x.y.z-prerelease.<sha>` under the `prerelease` dist-tag straight
from the working copy — no tags, no GitHub release, no CHANGELOG.
