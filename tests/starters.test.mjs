// The website starters in templates/quality and templates/process, against Git Crafter's engine at the ci.yml pin
// (GIT_CRAFTER; tests/engine.sh sets it). The Quality starter builds a page with its six tabs and reads the example site;
// every Process step scores a metric on that page; each README's tables match its config; and no starter file holds a
// dash, a home path or the reserved name.
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
assert.ok(process.env.GIT_CRAFTER, 'GIT_CRAFTER names a Git Crafter checkout at the ci.yml pin: run bash tests/engine.sh');
const engine = (path) => import(pathToFileURL(join(process.env.GIT_CRAFTER, path)).href);
const { loadConfig } = await engine('quality/config.mjs');
const { buildPage } = await engine('quality/build.mjs');
const { TABS } = await engine('quality/score.mjs');
const { checkMaps, qualityDefs } = await engine('pages/build.mjs');
const { configScope, readDocs } = await engine('tools/collect_org.mjs');

const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const STARTERS = ['templates/quality', 'templates/process'];
const files = STARTERS.flatMap((dir) => readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile()).map((e) => relative(ROOT, join(e.parentPath, e.name))));
// The body rows of the Markdown table whose header line starts with heading, each as its cells.
const rows = (text, heading) => text.slice(text.indexOf(heading)).split('\n\n')[0].split('\n').slice(2)
  .map((line) => line.split(' | ').map((cell) => cell.replace(/^\| | \|$/g, '')));
const ids = (cell) => [...cell.matchAll(/`([a-z-]+)`/g)].map((m) => m[1]);

// The two starters laid out as a site repo has them, with an empty run so the page builds.
function siteRepo(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'site-starter-'));
  try {
    mkdirSync(join(dir, 'quality', 'process'), { recursive: true });
    mkdirSync(join(dir, 'quality', 'data'));
    cpSync(join(ROOT, 'templates/quality/config.json'), join(dir, 'quality/config.json'));
    cpSync(join(ROOT, 'templates/quality/targets'), join(dir, 'quality/targets'), { recursive: true });
    cpSync(join(ROOT, 'templates/process/config.json'), join(dir, 'quality/process/config.json'));
    writeFileSync(join(dir, 'quality/data/latest.json'), JSON.stringify({ generated_at: '2026-11-24T00:00:00Z', commit: 'abc1234', mode: 'ci', metrics: {} }));
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('quality starter: the page builds with its six tabs and no data of its own', () => siteRepo((dir) => {
  const config = loadConfig({ root: dir, file: 'quality/config.json', env: {} });
  const ids = json('templates/quality/config.json').tabs;
  assert.deepEqual(config.tabs.map((t) => (Array.isArray(t) ? t[0] : t)), ids);
  const page = buildPage(config, { now: new Date('2026-11-24T12:00:00Z') });
  assert.equal(page.code, 0, 'the starter builds');
  for (const id of ids) assert.ok(page.html.includes(`<section id="${id}" class="view tab"`), `${id} has a panel`);
}));

test('quality starter: targets/web.json reaches the engine, one example site for every Pages metric', () => siteRepo((dir) => {
  const { defs, why } = qualityDefs(dir, 'quality/config.json');
  assert.ok(defs, why);
  const design = defs['design.raw_hex'].params;
  const usability = defs['usability.reading_grade'].params;
  assert.equal(design.origin, 'https://www.example.com/');
  for (const key of ['origin', 'site_dir', 'key_pages']) assert.deepEqual(usability[key], design[key], key);
  assert.equal(defs['deploy.waiting_merges'].params.platform, 'pages');
  assert.deepEqual(defs['tests.e2e_routes'].params.suites.map((s) => s.dir), ['tests/unit/', 'tests/e2e/']);
}));

test('quality README: the six tabs in order, and the left-out tabs make up the rest of the engine\'s', () => {
  const text = read('templates/quality/README.md');
  const kept = rows(text, '| Tab |').flatMap(([tab]) => ids(tab));
  assert.deepEqual(kept, json('templates/quality/config.json').tabs);
  const left = rows(text, '| Left out |').flatMap(([tabs]) => ids(tabs));
  assert.deepEqual([...kept, ...left].sort(), TABS.map(([id]) => id).sort());
});

test('process starter: every step of every map scores a metric on the Quality page, and the README matches', () => siteRepo((dir) => {
  const { maps } = readDocs(dir, configScope(json('templates/process/config.json')).docs);
  const { defs } = qualityDefs(dir, 'quality/config.json');
  assert.deepEqual(checkMaps(maps, new Set(Object.keys(defs)), 'config.json'), []);
  const table = new Map(rows(read('templates/process/README.md'), '| Map |').map(([map, ...cells]) => [ids(map)[0], cells]));
  assert.deepEqual([...table.keys()], maps.maps.map((m) => m.id));
  for (const map of maps.maps) {
    const [steps, tabs, needs] = table.get(map.id);
    assert.equal(Number(steps), map.steps.length, `${map.id}: step count`);
    assert.deepEqual(ids(tabs).sort(), [...new Set(map.steps.map((s) => defs[s.metric].tab))].sort(), `${map.id}: tabs`);
    const tokens = [...new Set(map.steps.map((s) => defs[s.metric].needs).filter((n) => n && n !== 'none'))];
    assert.deepEqual(ids(needs), tokens, `${map.id}: tokens`);
  }
}));

test('starters: no dash, home path, private host or reserved name; every relative link resolves', () => {
  for (const f of files) {
    const text = read(f);
    assert.doesNotMatch(text, /[–—]/, `${f}: a dash`);
    assert.doesNotMatch(text, /\/Users\/|~\/|soulcraft\.computer/i, `${f}: a private path or host`);
    assert.doesNotMatch(text.replaceAll('github.com/SoulCraft-Org/', ''), /soul\s*craft/i, `${f}: the reserved name`);
    for (const [, link] of text.matchAll(/\]\(([^)\s#]+)[^)]*\)/g)) {
      if (!/^[a-z]+:/i.test(link)) assert.ok(existsSync(resolve(dirname(join(ROOT, f)), link)), `${f} links ${link}`);
    }
  }
});
