// What the tests share: this repo's files, Git Crafter's engine at the ci.yml pin (GIT_CRAFTER), the starters laid out
// as a site repo, and Markdown tables read the way the tests compare them with the files they describe.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const read = (path) => readFileSync(join(ROOT, path), 'utf8');
export const json = (path) => JSON.parse(read(path));

// A module of the engine, by its path in Git Crafter.
export function engine(path) {
  assert.ok(process.env.GIT_CRAFTER, 'GIT_CRAFTER names a Git Crafter checkout at the ci.yml pin: run bash tests/engine.sh');
  return import(pathToFileURL(join(process.env.GIT_CRAFTER, path)).href);
}

// The two starters laid out as a site repo has them, with an empty run so the page builds; edit changes the copied
// configs first. The pack the quality starter pins sits where Git Crafter looks for it with no CODE_OS_PACKS set,
// .code-os-packs/<owner>/<repo>: a copy of this repo's pack.json and maps/. The folder is gone when fn returns.
export function siteRepo(fn, edit = () => {}) {
  const dir = mkdtempSync(join(tmpdir(), 'site-starter-'));
  try {
    mkdirSync(join(dir, 'quality', 'process'), { recursive: true });
    mkdirSync(join(dir, 'quality', 'data'));
    const pack = join(dir, '.code-os-packs', 'SoulCraft-Org', 'website-crafter');
    mkdirSync(pack, { recursive: true });
    cpSync(join(ROOT, 'pack.json'), join(pack, 'pack.json'));
    cpSync(join(ROOT, 'maps'), join(pack, 'maps'), { recursive: true });
    cpSync(join(ROOT, 'templates/quality/targets'), join(dir, 'quality/targets'), { recursive: true });
    const quality = json('templates/quality/config.json');
    const processConfig = json('templates/process/config.json');
    edit({ dir, quality, processConfig });
    writeFileSync(join(dir, 'quality/config.json'), JSON.stringify(quality));
    writeFileSync(join(dir, 'quality/process/config.json'), JSON.stringify(processConfig));
    writeFileSync(join(dir, 'quality/data/latest.json'), JSON.stringify({ generated_at: '2026-11-24T00:00:00Z', commit: 'abc1234', mode: 'ci', metrics: {} }));
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// The body rows of the first table whose header line starts with heading, after from when given, each as its cells.
export const rows = (text, heading, from = '') => text.slice(text.indexOf(heading, text.indexOf(from))).split('\n\n')[0]
  .split('\n').slice(2).map((line) => line.split(' | ').map((cell) => cell.replace(/^\| | \|$/g, '')));

// The ids in backticks in one cell, such as `pages`, `code`.
export const ids = (cell) => [...cell.matchAll(/`([a-z-]+)`/g)].map((m) => m[1]);
