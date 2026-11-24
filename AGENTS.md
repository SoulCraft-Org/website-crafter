# Website Crafter

Instructions for every coding agent in this repo. Claude Code reads this file through `CLAUDE.md`.

| Topic | Rule |
| --- | --- |
| What this repo is | A Claude Code plugin and starters for crafting a website: the method, Quality and Process starters, maps and page tests |
| Build and test | `pip install -r tools/requirements.txt` once, then `python3 -I tools/check_plugin.py --self-test`, `python3 -I tools/check_plugin.py`, `bash tools/voice_lint.sh` and `bash tests/engine.sh`. CI runs them through Git Crafter's `ci-standard.yml` |
| Starters | `templates/` holds what a site repo copies. `tests/starters.test.mjs` checks each against Git Crafter's engine at the `ci.yml` pin; a README table that disagrees with its config fails it |
| Shipping | Branch, commit with `git commit -s`, stage by path, push the branch and open a pull request. Never push to `main` |
| Page tests | `templates/tests/*.spec.ts` run in CI's standard job only, against `tests/fixture/good` (every test passes) and `tests/fixture/bad` (every test must fail, `check-bad.mjs`). Never start a browser or a server on a laptop that only edits |
| Pack | `pack.json` adds no tab; `maps/` holds the pack's Process maps. `tests/pack.test.mjs` runs Git Crafter's `checkLibrary` and `checkMaps` on them, and holds `maps/README.md` equal to the map files |
| Guards | `templates/hooks/guards.py` holds every hook rule; `guards.json` holds a site's data and a sample per rule. `--self-test` matches samples as text and never runs one |
| Export | `tools/export_public.py` copies only tracked, allow-listed files, or nothing. Its patterns live in `tools/export_rules.json`, and a finding never prints the text it matched |
| Prompting skills | `plugin/skills/prompt-*` keep a `<style block>` placeholder; `tests/skills.test.mjs` fails when a site's own art direction or name lands in one |
| Names and art | No SoulCraft name, character or art in a starter or a skill ([NOTICE](NOTICE)) |
| Secrets | Never print, copy or commit a key value, a private path or personal data |
| Writing | One idea per sentence, no em dashes. Attribute every figure in its sentence, or label it a goal |
