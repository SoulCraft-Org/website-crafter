# Website Crafter

Instructions for every coding agent in this repo. Claude Code reads this file through `CLAUDE.md`.

| Topic | Rule |
| --- | --- |
| What this repo is | A Claude Code plugin and starters for crafting a website: the method, Quality and Process starters, maps and page tests |
| Build and test | `python3 -I tools/check_plugin.py --self-test`, `python3 -I tools/check_plugin.py`, `bash tools/voice_lint.sh` and `bash tests/engine.sh`. CI runs them through Git Crafter's `ci-standard.yml` |
| Starters | `templates/` holds what a site repo copies. `tests/starters.test.mjs` checks each against Git Crafter's engine at the `ci.yml` pin; a README table that disagrees with its config fails it |
| Shipping | Branch, commit with `git commit -s`, stage by path, push the branch and open a pull request. Never push to `main` |
| Names and art | No SoulCraft name, character or art in a starter or a skill ([NOTICE](NOTICE)) |
| Secrets | Never print, copy or commit a key value, a private path or personal data |
| Writing | One idea per sentence, no em dashes. Attribute every figure in its sentence, or label it a goal |
