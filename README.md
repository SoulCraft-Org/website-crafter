# Website Crafter

Craft your own website with Claude: a plugin with the method, Quality, Speed and Consumption starters, process maps and page tests. Published by [SoulCraft-Org](https://github.com/SoulCraft-Org) under [Apache-2.0](LICENSE).

This README is a stub while the first release is built. [Issue 5](https://github.com/SoulCraft-Org/website-crafter/issues/5) tracks the full one.

## Install the plugin

```bash
claude plugin marketplace add SoulCraft-Org/website-crafter
```

```bash
claude plugin install website-crafter@website-crafter
```

| Part | Holds |
| --- | --- |
| [plugin/skills/craft-site](plugin/skills/craft-site/SKILL.md) | The method: one role and one signature move per page, a start-up budget, same-origin pages, pausable motion, a words lint, stage before ship |
| [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json) | The marketplace that lists the plugin |
| [tools/check_plugin.py](tools/check_plugin.py) | The check that the marketplace, the manifest and each skill agree |

## Related

| Repo | Use |
| --- | --- |
| [SoulCraft-Org/git-crafter](https://github.com/SoulCraft-Org/git-crafter) | The CI standard this repo runs on, and the Quality and Process pages |
| [SoulCraft-Org/compute-crafter](https://github.com/SoulCraft-Org/compute-crafter) | Free tiers and included credits for the compute a site needs |
