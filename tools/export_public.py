#!/usr/bin/env python3
"""export_public.py: copy a private site repo's allow-listed files into a fresh public repo, or copy nothing.

The open map's Check step: the pre-publish check before code goes public. Only files git tracks are read, so an
untracked local settings file never leaves. Of those, only paths that match a glob in the allow list are copied. A
tracked symlink or gitlink, or a path whose real location leaves the repo, refuses the export. Every text file to copy,
and every path, is scanned against tools/export_rules.json: an email address (example domains aside), a path inside a
home folder, or a key-shaped string refuses the whole export. A binary file is copied unscanned only when its extension
is in binary_ok. A finding prints the file, the line and the rule's id, never the text it matched; a path is printed
with its match masked.

    export_public.py --from SITE --to NEW [--allow FILE] [--dry-run]
        FILE (default SITE/export.json) is {"paths": ["src/**", "public/**", "package.json"]}. NEW must not exist or
        be empty; it is created, filled and given git init, with nothing committed. --dry-run lists, writes nothing
    export_public.py --self-test
        a seeded repo with a key, an email, a home path, a symlink, an email in a file's name and an unknown binary is
        refused whole; the same repo clean copies only its allow-listed, tracked files, a binary_ok picture unscanned;
        a NEW that is not empty is a usage error

Exit 0 copied (or listed), 1 refused with nothing written, 2 a usage error or a repo or file that cannot be read.
"""
import argparse
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent


def glob_re(glob):
    out = re.escape(glob).replace(r"\*\*", "\0").replace(r"\*", "[^/]*").replace(r"\?", "[^/]")
    return re.compile(out.replace("\0", ".*"))


def tracked(repo):
    """Each tracked path with its git mode: 120000 is a symlink, 160000 a gitlink (a submodule)."""
    out = subprocess.run(["git", "-C", str(repo), "ls-files", "-s", "-z"], capture_output=True, check=True).stdout
    return [(e.split(" ", 1)[0], e.split("\t", 1)[1]) for e in out.decode("utf-8").split("\0") if e]


def path_findings(path, rules):
    """The rules a file's own path breaks, each printed with its match masked."""
    found = []
    for r in rules["refuse"]:
        hits = [m for m in re.finditer(r["pattern"], path)
                if not (r["id"] == "email" and m.group(1).lower() in rules["allow_email_domains"])]
        if hits:
            masked = re.sub(r["pattern"], "<" + r["id"] + ">", path)
            found.append(f"{masked}: {r['id']} in its path ({r['why']})")
    return found


def kind(src, mode, path):
    """Why a tracked entry is never copied, or None for a regular file inside the repo. lstat: a link is not followed."""
    if mode == "160000":
        return "a gitlink (submodule)"
    full = src / path
    if mode == "120000" or stat.S_ISLNK(os.lstat(full).st_mode):
        return "a symlink"
    if not stat.S_ISREG(os.lstat(full).st_mode) or not full.resolve().is_relative_to(src.resolve()):
        return "not a regular file inside the repo"
    return None


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
    entries = [(m, p) for m, p in tracked(src) if any(g.fullmatch(p) for g in globs)]
    chosen, blobs, bad = [p for _, p in entries], {}, []
    for mode, p in entries:
        bad += path_findings(p, rules)
        why = kind(src, mode, p)
        if why:
            bad.append(f"{p}: {why}, never copied")
            continue
        blobs[p] = (src / p).read_bytes()
        bad += findings(p, blobs[p], rules)
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
    mail = "me" + "@" + "realsite.io"
    git = ["git", "-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false"]
    with tempfile.TemporaryDirectory() as tmp:
        site, out = Path(tmp, "site"), Path(tmp, "out")
        Path(tmp, "outside.txt").write_text("private, outside the repo\n", encoding="utf-8")
        texts = {
            "src/index.html": "<p>Write to hello@example.com</p>\n",
            "src/config.js": f'export const key = "{key}";\n',
            "src/contact.md": f"Mail {mail}\n",
            "src/notes.md": "Built in " + "/Us" + "ers/someone/site\n",
            f"src/team/{mail}.md": "A clean page whose name holds an address\n",
            "docs/private.md": f"Not on the allow list {mail}\n",
        }
        logo = b"\x89PNG\r\n\x1a\n\xff" + mail.encode()   # binary_ok: copied unscanned, address bytes and all
        blobs = {"public/logo.png": logo, "public/brochure.pdf": b"%PDF-1.7\n\xff\xfe"}
        for p, text in texts.items():
            Path(site, p).parent.mkdir(parents=True, exist_ok=True)
            Path(site, p).write_text(text, encoding="utf-8")
        for p, data in blobs.items():
            Path(site, p).parent.mkdir(parents=True, exist_ok=True)
            Path(site, p).write_bytes(data)
        Path(site, "src/link.md").symlink_to(Path("..", "..", "outside.txt"))   # a tracked link to a file outside
        subprocess.run(["git", "init", "-q", str(site)], check=True)
        subprocess.run(git + ["-C", str(site), "add", *texts, *blobs, "src/link.md"], check=True)
        subprocess.run(git + ["-C", str(site), "commit", "-q", "-m", "seed"], check=True)
        Path(site, "local.env").write_text("TOKEN=untracked\n", encoding="utf-8")
        allow = {"paths": ["src/**", "public/**"]}
        code, lines = export(site, out, allow, rules)
        want = ["src/config.js:1: aws-key", "src/contact.md:1: email", "src/notes.md:1: home-path", "src/link.md: a symlink",
                "src/team/<email>: email in its path", "public/brochure.pdf: binary"]
        refused = (code == 1 and not out.exists() and all(any(l.startswith(w) for l in lines) for w in want)
                   and not any(key in l or mail in l for l in lines))
        for p in ("src/config.js", "src/contact.md", "src/notes.md", "src/link.md", f"src/team/{mail}.md", "public/brochure.pdf"):
            subprocess.run(git + ["-C", str(site), "rm", "-q", p], check=True)
        subprocess.run(git + ["-C", str(site), "commit", "-q", "-m", "clean"], check=True)
        code2, _ = export(site, out, allow, rules)
        copied = sorted(str(p.relative_to(out)) for p in out.rglob("*") if p.is_file() and ".git" not in p.parts)
        clean = (code2 == 0 and copied == ["public/logo.png", "src/index.html"] and (out / ".git").is_dir()
                 and (out / "public/logo.png").read_bytes() == logo)
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
