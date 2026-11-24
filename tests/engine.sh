#!/usr/bin/env bash
# The starters' tests against Git Crafter's engine at the commit ci.yml pins (CI's short job). No engine code is committed
# here: the engine is fetched at that commit, its packages installed with no scripts, and its path passed as GIT_CRAFTER.
# A GIT_CRAFTER already set (a local checkout at the pin) skips the fetch. Exit 0 passes, 1 a test or the pin failed.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -z "${GIT_CRAFTER:-}" ]; then
  sha=$(sed -nE 's|.*SoulCraft-Org/git-crafter/\.github/workflows/ci-standard\.yml@([0-9a-f]{40}).*|\1|p' .github/workflows/ci.yml)
  if [ -z "$sha" ]; then echo "::error::.github/workflows/ci.yml pins no Git Crafter commit"; exit 1; fi
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT
  GIT_CRAFTER="$tmp/git-crafter"
  git init -q "$GIT_CRAFTER"
  git -C "$GIT_CRAFTER" fetch -q --depth 1 https://github.com/SoulCraft-Org/git-crafter "$sha"
  git -C "$GIT_CRAFTER" checkout -q --detach FETCH_HEAD
  npm ci --prefix "$GIT_CRAFTER" --ignore-scripts --no-audit --no-fund --loglevel=error
fi
GIT_CRAFTER="$GIT_CRAFTER" node --test tests/*.test.mjs
