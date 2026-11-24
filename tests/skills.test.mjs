// The media prompting skills stay generic: each keeps its "Your site's style block" section with the <style block>
// placeholder, and uses the placeholder again in its example, so a site fills in its own look. No plugin skill names the
// site these came from or its art direction.
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { read, ROOT } from './lib.mjs';

const SKILLS = readdirSync(join(ROOT, 'plugin/skills'));
const PROMPTING = ['prompt-fibo', 'prompt-ltx', 'prompt-meshy'];
const SITE_TERMS = /soul\s*craft|world of warcraft|blizzard|this site's|the cast guard/i;

test('the three prompting skills are in the plugin', () => {
  for (const name of PROMPTING) assert.ok(SKILLS.includes(name), name);
});

test('each prompting skill keeps its style block a placeholder, in its own section and in its example', () => {
  for (const name of PROMPTING) {
    const text = read(`plugin/skills/${name}/SKILL.md`);
    const section = text.slice(text.indexOf("## Your site's style block"));
    assert.ok(text.includes("## Your site's style block"), `${name}: the style block section`);
    assert.match(section.split('\n## ')[0], /`<style block>`/, `${name}: the placeholder in its section`);
    assert.ok(text.split('<style block>').length - 1 >= 2, `${name}: the placeholder in its example too`);
  }
});

test("no plugin skill names the site the skills came from, or its art direction", () => {
  for (const name of SKILLS) assert.doesNotMatch(read(`plugin/skills/${name}/SKILL.md`), SITE_TERMS, name);
});
