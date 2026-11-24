#!/usr/bin/env python3
"""guards.py: the three guards a site's Claude Code hooks route to (Website Crafter templates/hooks).

One definition for every call site: .claude/settings.json runs it on PreToolUse, and CI runs --self-test. The git
staging rules are built in. A site's generated files, its deploy commands and tools, and a sample for each rule are
data, in guards.json beside this file.

  guards.py generated    Edit and Write: a generated file is never edited by hand. Exit 2 blocks, with the reason
  guards.py staging      Bash: git add -A, --all, -u or ., git commit -a, and --amend with no pathspec. Exit 2 blocks
  guards.py deploy       Bash and MCP tools: a call that changes what is live becomes a permission prompt
  guards.py --self-test  the built-in staging samples and guards.json's samples, matched as text and never run; every
                         rule must be hit by a sample. Exit 1 if one is judged wrong

The hook's JSON arrives on stdin (tool_name, tool_input). Exit 0 lets the call through. A guard that cannot read its
input or its data exits 1, which Claude Code shows as a hook error and lets through: could not check is not a finding.
"""
import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Staging shapes that take the whole tree, judged on the command with quoted text (commit messages) blanked.
GIT = r"\bgit(?:\s+-C\s+\S+)*\s+"
STAGING = [
    (GIT + r"add\b[^|;&\n]*\s(?:-A|--all|-u|--update|\.)(?=\s|$|[;&|])",
     "git add -A, --all, -u or . stages the whole tree. Name the paths: git add <paths>"),
    (GIT + r"commit\b[^|;&\n]*\s(?:--all|-a[a-z]*)(?=\s|$|[;&|])",
     "git commit -a commits every change in the tree. Stage explicit paths, then commit those"),
    (GIT + r"commit\b[^|;&\n]*--amend(?![^|;&\n]*\s--\s)",
     "git commit --amend with no pathspec rewrites the whole last commit. Pass -- <paths>, or make a new commit"),
]
STAGING_SAMPLES = [
    ("git add -A", "block"), ("git -C site add .", "block"), ("git commit -am 'fix'", "block"),
    ("git commit --amend", "block"), ("git add src/pages/index.astro", "pass"),
    ('git commit -m "add . and -A to the docs"', "pass"), ("git commit --amend --no-edit -- src/a.ts", "pass"),
]


def glob_re(glob):
    """A repo-root glob as a regex: ** crosses folders, * and ? stay inside one."""
    out = re.escape(glob).replace(r"\*\*", "\0").replace(r"\*", "[^/]*").replace(r"\?", "[^/]")
    return re.compile(out.replace("\0", ".*"))


def repo_path(path, root):
    """A tool's file path from the repo root, also when it sits in a worktree under .claude/worktrees/."""
    rel = os.path.relpath(path, root) if os.path.isabs(path) else path
    rel = re.sub(r"^(?:\.\./)+", "", rel.replace(os.sep, "/"))
    return re.sub(r"^(?:[^/]+/)*?\.claude/worktrees/[^/]+/", "", rel)


def generated(event, data, root):
    rel = repo_path((event.get("tool_input") or {}).get("file_path") or "", root)
    for i, g in enumerate(data["generated"]):
        if glob_re(g["glob"]).fullmatch(rel):
            return "block", f"{rel} is generated: {g['why']}", ("generated", i)
    return "pass", "", None


def staging(event):
    bare = re.sub(r'"[^"]*"|\'[^\']*\'', '""', (event.get("tool_input") or {}).get("command") or "")
    for pattern, why in STAGING:
        if re.search(pattern, bare):
            return "block", why, None
    return "pass", "", None


def deploy(event, data):
    tool, given = event.get("tool_name") or "", event.get("tool_input") or {}
    if tool == "Bash":
        for segment in re.split(r"&&|\|\||[;|\n]", given.get("command") or ""):
            words = segment.split()
            for i, r in enumerate(data["deploy"]):
                if (re.search(r["pattern"], segment) and not any(f in words for f in r.get("unless", []))
                        and all(f in words for f in r.get("only_with", []))):
                    return "ask", r["why"], ("deploy", i)
        return "pass", "", None
    name = tool.rsplit("__", 1)[-1]
    for i, r in enumerate(data["tools"]):
        safe = r.get("unless_input") or {}
        if re.search(r["pattern"], name) and not (safe and all(re.search(rx, str(given.get(k) or "")) for k, rx in safe.items())):
            return "ask", r["why"], ("tools", i)
    return "pass", "", None


def judge(mode, event, data, root):
    if mode == "generated":
        return generated(event, data, root)
    if mode == "staging":
        return staging(event)
    return deploy(event, data)


def self_test():
    data = json.loads((HERE / "guards.json").read_text(encoding="utf-8"))
    cases = [("staging", {"tool_name": "Bash", "tool_input": {"command": c}}, want) for c, want in STAGING_SAMPLES]
    for s in data["samples"]:
        if "path" in s:
            event = {"tool_name": "Edit", "tool_input": {"file_path": "/repo/" + s["path"]}}
        elif "tool" in s:
            event = {"tool_name": s["tool"], "tool_input": s.get("input", {})}
        else:
            event = {"tool_name": "Bash", "tool_input": {"command": s["command"]}}
        cases.append((s["guard"], event, s["expect"]))
    wrong, hit = [], set()
    for mode, event, want in cases:
        got, _, rule = judge(mode, event, data, "/repo")
        hit.add(rule)
        if got != want:
            wrong.append(f"{mode}: {json.dumps(event['tool_input'])} was {got}, not {want}")
    every = {(k, i) for k in ("generated", "deploy", "tools") for i in range(len(data[k]))}
    wrong += [f"{k} rule {i} has no sample that hits it" for k, i in sorted(every - hit)]
    for line in wrong:
        print(f"::error::{line}")
    print(f"guards self-test: {len(cases)} samples, {'PASS' if not wrong else 'FAIL'}")
    return 1 if wrong else 0


def main(argv):
    mode = argv[1] if len(argv) > 1 else ""
    if mode == "--self-test":
        return self_test()
    if mode not in ("generated", "staging", "deploy"):
        print(__doc__, file=sys.stderr)
        return 1
    try:
        event = json.loads(sys.stdin.read() or "{}")
        data = json.loads((HERE / "guards.json").read_text(encoding="utf-8")) if mode != "staging" else {}
    except (OSError, ValueError) as e:
        print(f"guards.py could not check: {e}", file=sys.stderr)
        return 1
    verdict, why, _ = judge(mode, event, data, os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())
    if verdict == "block":
        print(f"blocked by .claude/hooks/guards.py {mode}: {why}", file=sys.stderr)
        return 2
    if verdict == "ask":
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask",
                                                 "permissionDecisionReason": f"{why}: the owner says yes to each one"}}))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
