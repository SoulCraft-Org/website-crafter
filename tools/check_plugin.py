#!/usr/bin/env python3
"""check_plugin.py: the marketplace, each plugin manifest and every skill agree.

Field rules from the Claude Code docs (plugin marketplaces, plugins reference, skills; read 2026-11-24):
  marketplace  .claude-plugin/marketplace.json has name, owner.name and plugins; each plugin a kebab-case name
               and a source that starts with ./, holds no .., and contains .claude-plugin/plugin.json
  manifest     plugin.json's name is its marketplace entry's name; version and license agree where both set them
  skills       each skills/<name>/SKILL.md opens with front matter whose name is its folder's and whose
               description is set and at most 1,536 characters, the listing's cut-off. The front matter is
               parsed as YAML, the way Claude Code reads it, so a plain value that holds ": " is a finding:
               quote it

    check_plugin.py [ROOT]     exit 0 passes, 1 a finding, 2 a manifest is missing or not JSON, or PyYAML is
                               not installed (pip install -r tools/requirements.txt)
    check_plugin.py --self-test   a seeded good and bad marketplace; exit 1 if either behaves wrong
"""
import json
import re
import sys
import tempfile
from pathlib import Path

try:
    import yaml
except ImportError:  # infrastructure, not a finding: could not check
    yaml = None

KEBAB = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
LIMIT = 1536


class Unreadable(Exception):
    pass


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise Unreadable(f"{path}: {e}") from e


# A skill's front matter as a mapping, None when there is none, or the YAML error's first line as a string.
def front(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None
    try:
        meta = yaml.safe_load(m.group(1))
    except yaml.YAMLError as e:
        return str(e).splitlines()[0]
    return meta if isinstance(meta, dict) else "it is not a mapping of keys"


def findings(root):
    market = load(root / ".claude-plugin" / "marketplace.json")
    bad = [f"marketplace.json has no {k}" for k in ("name", "plugins") if not market.get(k)]
    if not (market.get("owner") or {}).get("name"):
        bad.append("marketplace.json has no owner.name")
    for entry in market.get("plugins") or []:
        name, source = entry.get("name", ""), entry.get("source", "")
        if not KEBAB.match(name):
            bad.append(f"plugin {name!r} is not kebab-case")
        if not isinstance(source, str) or not source.startswith("./") or ".." in source:
            bad.append(f"plugin {name!r}: source {source!r} must start with ./ and hold no ..")
            continue
        manifest = load(root / source / ".claude-plugin" / "plugin.json")
        if manifest.get("name") != name:
            bad.append(f"plugin {name!r}: plugin.json names {manifest.get('name')!r}")
        bad += [f"plugin {name!r}: {k} differs from plugin.json" for k in ("version", "license")
                if k in entry and k in manifest and entry[k] != manifest[k]]
        skills = sorted((root / source / "skills").glob("*/SKILL.md"))
        if not skills:
            bad.append(f"plugin {name!r} has no skills/<name>/SKILL.md")
        for skill in skills:
            meta, rel = front(skill.read_text(encoding="utf-8")), skill.relative_to(root)
            if meta is None:
                bad.append(f"{rel} has no front matter")
            elif isinstance(meta, str):
                bad.append(f"{rel}: front matter is not valid YAML ({meta}); quote a value that holds ': '")
            elif meta.get("name") != skill.parent.name:
                bad.append(f"{rel}: name {meta.get('name')!r} is not its folder's")
            elif not isinstance(meta.get("description"), str) or not 0 < len(meta["description"]) <= LIMIT:
                bad.append(f"{rel}: description is empty or over {LIMIT} characters")
    return bad


def self_test():
    def seed(dir, skill_name, plugin_name, description="d"):
        (dir / ".claude-plugin").mkdir(parents=True)
        (dir / ".claude-plugin" / "marketplace.json").write_text(json.dumps(
            {"name": "m", "owner": {"name": "o"}, "plugins": [{"name": "good-one", "source": "./p", "version": "1"}]}))
        (dir / "p" / ".claude-plugin").mkdir(parents=True)
        (dir / "p" / ".claude-plugin" / "plugin.json").write_text(json.dumps({"name": plugin_name, "version": "1"}))
        (dir / "p" / "skills" / "s").mkdir(parents=True)
        (dir / "p" / "skills" / "s" / "SKILL.md").write_text(f"---\nname: {skill_name}\ndescription: {description}\n---\n")
    with tempfile.TemporaryDirectory() as tmp:
        good, bad, plain = Path(tmp, "good"), Path(tmp, "bad"), Path(tmp, "plain")
        seed(good, "s", "good-one", '"Use it when: quoted"')
        seed(bad, "other", "Bad One")
        seed(plain, "s", "good-one", "Use it when: unquoted")
        wrong = findings(bad)
        ok = (findings(good) == [] and len(wrong) == 2 and any("plugin.json names" in f for f in wrong)
              and [f for f in findings(plain) if "not valid YAML" in f] == findings(plain) != [])
    print(f"check_plugin self-test: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


def main(argv):
    if yaml is None:
        print("::error::could not check: PyYAML is not installed; run pip install -r tools/requirements.txt")
        return 2
    if argv[1:] == ["--self-test"]:
        return self_test()
    root = Path(argv[1]) if len(argv) > 1 else Path(__file__).resolve().parent.parent
    try:
        bad = findings(root)
    except Unreadable as e:
        print(f"::error::could not check: {e}")
        return 2
    for line in bad:
        print(f"::error::{line}")
    print(f"check_plugin: {len(bad)} findings")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
