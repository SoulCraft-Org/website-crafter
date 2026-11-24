#!/usr/bin/env bash
# The voice lint on every Markdown file git tracks. The lint is Git Crafter's tools/voice_lint.py, read at the commit
# ci.yml pins, so one Dependabot bump moves the CI standard and the lint together and no copy here can drift.
# Exit 0 passes (warnings print), 1 a blocking finding or a missing pin.
set -euo pipefail
cd "$(dirname "$0")/.."
sha=$(sed -nE 's|.*SoulCraft-Org/git-crafter/\.github/workflows/ci-standard\.yml@([0-9a-f]{40}).*|\1|p' .github/workflows/ci.yml)
if [ -z "$sha" ]; then echo "::error::.github/workflows/ci.yml pins no Git Crafter commit"; exit 1; fi
lint="$(mktemp -d)/voice_lint.py"
curl -fsSL --retry 3 "https://raw.githubusercontent.com/SoulCraft-Org/git-crafter/$sha/tools/voice_lint.py" -o "$lint"
python3 -I "$lint" --self-test
git ls-files -z '*.md' | xargs -0 python3 -I "$lint"
