// The pack: pack.json and the four maps in maps/, against Git Crafter's engine at the ci.yml pin (GIT_CRAFTER). Each map
// passes the engine's library checks and loads beside its library; the starters pin this pack at a full SHA and draw all
// four next to the library maps, every step a metric on the website quality starter's page; and maps/README.md matches.
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { engine, ids, json, read, ROOT, rows, siteRepo } from './lib.mjs';

const { loadLibrary } = await engine('pages/library.mjs');
const { checkLibrary, checkMaps, qualityDefs } = await engine('pages/build.mjs');
const { configScope, readDocs } = await engine('tools/collect_org.mjs');

const MAPS = ['media', 'stage', 'reveal', 'open'];
const pack = Object.fromEntries(MAPS.map((id) => [id, json(`maps/${id}.json`)]));

test('pack.json adds no tab, and maps/ holds the four maps', () => {
  assert.deepEqual(json('pack.json'), { tabs: [] });
  assert.deepEqual(readdirSync(join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).sort(), MAPS.map((id) => `${id}.json`).sort());
});

test("maps: each passes Git Crafter's library checks and loads beside its library", () => {
  const { defs, why } = qualityDefs(process.env.GIT_CRAFTER, 'templates/quality/config.json');
  assert.ok(defs, why);
  const kindOf = Object.fromEntries(Object.entries(defs).map(([id, d]) => [id, d.kind]));
  assert.deepEqual(checkLibrary(pack, new Set(Object.keys(defs)), kindOf), []);
  const library = loadLibrary(undefined, [join(ROOT, 'maps')]);
  for (const id of MAPS) assert.deepEqual(library[id], pack[id], id);
});

test('the starters pin this pack at a full SHA and draw its four maps, every step on their Quality page', () => siteRepo((dir) => {
  assert.deepEqual(json('templates/quality/config.json').packs.map((p) => p.replace(/@[0-9a-f]{40}$/, '@<sha>')), ['SoulCraft-Org/website-crafter@<sha>']);
  const uses = json('templates/process/config.json').maps.map((m) => m.use);
  assert.deepEqual(uses.filter((u) => MAPS.includes(u)), MAPS, 'the process starter uses every map of the pack');
  const { maps } = readDocs(dir, configScope(json('templates/process/config.json')).docs, 'quality/config.json');
  const { defs, why } = qualityDefs(dir, 'quality/config.json');
  assert.ok(defs, why);
  assert.deepEqual(maps.maps.map((m) => m.id), uses);
  assert.deepEqual(checkMaps(maps, new Set(Object.keys(defs)), 'config.json'), []);
  const table = new Map(rows(read('maps/README.md'), '| Map |').map(([map, ...cells]) => [ids(map)[0], cells]));
  assert.deepEqual([...table.keys()], MAPS);
  for (const id of MAPS) {
    const [steps, tabs, needs] = table.get(id);
    const map = pack[id];
    assert.equal(Number(steps), map.steps.length, `${id}: step count`);
    assert.deepEqual(ids(tabs).sort(), [...new Set(map.steps.map((s) => defs[s.metric].tab))].sort(), `${id}: tabs`);
    assert.deepEqual(ids(needs), [...new Set(map.steps.map((s) => defs[s.metric].needs).filter((n) => n && n !== 'none'))], `${id}: tokens`);
  }
}));

test("maps/README.md: each map's section lists its steps in order, with each rule and metric", () => {
  const text = read('maps/README.md');
  for (const id of MAPS) {
    const map = pack[id];
    assert.ok(text.includes(`## ${map.name}\n\n${map.why}.`), `${id}: a section headed by its name and why`);
    const got = rows(text, '| Step |', `## ${map.name}\n`).map(([name, rule, metric]) => [name, rule, metric.replace(/^`|`$/g, '')]);
    assert.deepEqual(got, map.steps.map((s) => [s.name, s.rule, s.metric]), id);
  }
});
