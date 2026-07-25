#!/usr/bin/env node
/**
 * Prints the npm dist-tag a version should be published under:
 * `2.2.0` -> `latest`, `2.2.0-rc.1` -> `rc`.
 */
export function distTagFor(version) {
  const prerelease = version.split('-')[1]
  if (!prerelease) return 'latest'
  return prerelease.split('.')[0]
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const version = process.argv[2]
  if (!version) {
    console.error('Usage: node scripts/npm-dist-tag.mjs <version>')
    process.exit(1)
  }
  console.log(distTagFor(version))
}
