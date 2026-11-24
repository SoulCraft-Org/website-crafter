// What ci.yml copies from the Git Crafter it pins: the engine in GIT_CRAFTER is that commit, and ci.yml's node-version is
// that commit's .nvmrc. A Dependabot bump that moves the pin and leaves node-version behind fails here.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ENGINE = process.env.GIT_CRAFTER;
const ci = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8');
const pin = /SoulCraft-Org\/git-crafter\/\.github\/workflows\/ci-standard\.yml@([0-9a-f]{40})/.exec(ci)?.[1];

test('GIT_CRAFTER is the commit ci.yml pins', () => {
  assert.ok(ENGINE, 'GIT_CRAFTER names a Git Crafter checkout at the ci.yml pin: run bash tests/engine.sh');
  assert.ok(pin, 'ci.yml pins ci-standard.yml at a full SHA');
  assert.equal(execFileSync('git', ['-C', ENGINE, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), pin);
});

test("ci.yml's node-version is the pinned Git Crafter's .nvmrc", () => {
  const node = /^\s*node-version:\s*"?([^"\s#]+)"?/m.exec(ci)?.[1];
  assert.equal(node, readFileSync(join(ENGINE, '.nvmrc'), 'utf8').trim());
});
