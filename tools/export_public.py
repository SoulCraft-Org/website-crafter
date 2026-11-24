#!/usr/bin/env python3
"""export_public.py: copy a private site repo's allow-listed files into a fresh public repo, or copy nothing.

The open map's Check step: the pre-publish check before code goes public. Only files git tracks are read, so an
untracked .env never leaves. Of those, only paths that match a glob in the allow list are copied. Every text file to
copy is scanned against tools/export_rules.json: an email address (example domains aside), a path inside a home folder,
or a key-shaped string refuses the whole export. A binary file is copied only when its extension is in binary_ok. A
finding prints the file, the line and the rule's id, never the text it matched.

    export_public.py --from SITE --to NEW [--allow FILE] [--dry-run]
        FILE (default SITE/export.json) is {"paths": ["src/**", "public/**", "package.json"]}. NEW must not exist or
        be empty; it is created, filled and given git init, with nothing committed. --dry-run lists, writes nothing
    export_public.py --self-test
        a seeded repo with a key, an email and a home path is refused whole; the same repo clean copies only its
        allow-listed, tracked files; a NEW that is not empty is a usage error

Exit 0 copied (or listed), 1 refused with nothing written, 2 a usage error or a repo or file that cannot be read.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent


def glob_re(glob):
    out = re.escape(glob).replace(r"\*\*", "\0").replace(r"\*", "[^/]*").replace(r"\?", "[^/]")
    return re.compile(out.replace("\0", ".*"))


def tracked(repo):
    out = subprocess.run(["git", "-C", str(repo), "ls-files", "-z"], capture_output=True, check=True).stdout
    return [p for p in out.decode("utf-8").split("\0") if p]


def findings(path, data, rules):
    """The rule ids a file breaks, by line; binary data passes only with an allowed extension."""
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return [] if Path(path).suffix.lower() in rules["binary_ok"] else [f"{path}: binary, not scanned"]
    found = []
    for n, line in enumerate(text.splitlines(), 1):
        for r in rules["refuse"]:
            for m in re.finditer(r["pattern"], line):
                if r["id"] == "email" and m.group(1).lower() in rules["allow_email_domains"]:
                    continue
                found.append(f"{path}:{n}: {r['id']} ({r['why']})")
                break
    return found


def export(src, dst, allow, rules, dry_run=False):
    """(exit code, lines to print). Writes NEW only when nothing is refused."""
    if dst.exists() and any(dst.iterdir()):
        return 2, [f"{dst} is not empty: export into a new folder"]
    globs = [glob_re(g) for g in allow["paths"]]
    chosen = [p for p in tracked(src) if any(g.fullmatch(p) for g in globs)]
    blobs = {p: (src / p).read_bytes() for p in chosen}
    bad = [f for p in chosen for f in findings(p, blobs[p], rules)]
    if bad:
        return 1, bad + [f"export_public: refused, {len(bad)} findings in {len(chosen)} files; nothing was written"]
    if dry_run:
        return 0, chosen + [f"export_public: {len(chosen)} files would be copied"]
    for p in chosen:
        (dst / p).parent.mkdir(parents=True, exist_ok=True)
        (dst / p).write_bytes(blobs[p])
    subprocess.run(["git", "init", "-q", str(dst)], check=True)
    return 0, [f"export_public: {len(chosen)} files copied to {dst}, with git init and nothing committed"]


def self_test():
    rules = json.loads((HERE / "export_rules.json").read_text(encoding="utf-8"))
    key = "AK" + "IA" + "Q" * 16            # built here, so this file never holds a key-shaped string
    git = ["git", "-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false"]
    with tempfile.TemporaryDirectory() as tmp:
        site, out = Path(tmp, "site"), Path(tmp, "out")
        files = {
            "src/index.html": "<p>Write to hello@example.com</p>\n",
            "src/config.js": f'export const key = "{key}";\n',
            "src/contact.md": "Mail " + "me" + "@" + "realsite.io\n",
            "src/notes.md": "Built in " + "/Us" + "ers/someone/site\n",
            "public/logo.png": "",
            "docs/private.md": "Not on the allow list " + "me" + "@" + "realsite.io\n",
        }
        for p, text in files.items():
            Path(site, p).parent.mkdir(parents=True, exist_ok=True)
            Path(site, p).write_text(text, encoding="utf-8")
        Path(site, "public/logo.png").write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00\xff" * 8)
        subprocess.run(["git", "init", "-q", str(site)], check=True)
        subprocess.run(git + ["-C", str(site), "add", *files], check=True)
        subprocess.run(git + ["-C", str(site), "commit", "-q", "-m", "seed"], check=True)
        Path(site, ".env").write_text("TOKEN=untracked\n", encoding="utf-8")
        allow = {"paths": ["src/**", "public/**"]}
        code, lines = export(site, out, allow, rules)
        refused = code == 1 and not out.exists() and sum(":" in l and "(" in l for l in lines[:-1]) == 3 and key not in "".join(lines)
        for p in ("src/config.js", "src/contact.md", "src/notes.md"):
            subprocess.run(git + ["-C", str(site), "rm", "-q", p], check=True)
        subprocess.run(git + ["-C", str(site), "commit", "-q", "-m", "clean"], check=True)
        code2, _ = export(site, out, allow, rules)
        copied = sorted(str(p.relative_to(out)) for p in out.rglob("*") if p.is_file() and ".git" not in p.parts)
        clean = code2 == 0 and copied == ["public/logo.png", "src/index.html"] and (out / ".git").is_dir()
        again, _ = export(site, out, allow, rules)
    ok = refused and clean and again == 2
    print(f"export_public self-test: refused {refused}, clean copy {clean}, not-empty refused {again == 2}: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


def main(argv):
    if argv[1:] == ["--self-test"]:
        return self_test()
    ap = argparse.ArgumentParser(description="Copy allow-listed files into a fresh public repo, or nothing.")
    ap.add_argument("--from", dest="src", required=True, type=Path)
    ap.add_argument("--to", dest="dst", required=True, type=Path)
    ap.add_argument("--allow", type=Path)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv[1:])
    try:
        rules = json.loads((HERE / "export_rules.json").read_text(encoding="utf-8"))
        allow = json.loads((args.allow or args.src / "export.json").read_text(encoding="utf-8"))
        code, lines = export(args.src.resolve(), args.dst.resolve(), allow, rules, args.dry_run)
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as e:
        print(f"::error::export_public could not run: {e}", file=sys.stderr)
        return 2
    for line in lines:
        print(f"::error::{line}" if code and not line.startswith("export_public:") else line)
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv))
