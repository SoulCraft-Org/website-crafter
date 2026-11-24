// The page tests' known-bad sample: run every spec in templates/tests against tests/fixture/bad, which breaks each rule
// once, and fail unless every test fails there. A spec that passes on the bad site checks nothing. CI only: it starts a
// browser. Exit 0 every test failed as it should, 1 one passed or a spec is missing, 2 the run could not be read.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const run = spawnSync('npx', ['playwright', 'test', '-c', 'tests/fixture/playwright.config.ts', '--reporter=json'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  env: { ...process.env, SITE_DIR: 'bad', SITE_PAGES: '/', SITE_JS_BUDGET: '64' },
});
let report;
try {
  report = JSON.parse(run.stdout);
} catch {
  console.error(`::error::could not read the bad run's report\n${run.stderr}`);
  process.exit(2);
}
const specs = (suite) => [...(suite.specs ?? []).map((s) => ({ file: s.file, title: s.title, ok: s.ok })), ...(suite.suites ?? []).flatMap(specs)];
const all = report.suites.flatMap(specs);
const passed = all.filter((s) => s.ok);
const files = new Set(all.map((s) => s.file.split('/').pop()));
const missing = readdirSync(new URL('../../templates/tests/', import.meta.url)).filter((f) => f.endsWith('.spec.ts') && !files.has(f));
for (const s of passed) console.log(`::error::${s.file}: "${s.title}" passed on the bad site`);
for (const f of missing) console.log(`::error::${f} ran no test on the bad site`);
console.log(`check-bad: ${all.length - passed.length} of ${all.length} tests failed on the bad site, as they should`);
process.exit(passed.length || missing.length || !all.length ? 1 : 0);
