// The page tests' known-bad sample: run every spec in templates/tests against tests/fixture/bad, which breaks each rule
// once, and fail unless every test fails there for its own rule. RULES pairs each test with the words its failure must
// carry, so a test that fails for another reason (a missing button, a server that did not start) does not count. A
// spec that passes on the bad site checks nothing. CI only: it starts a browser.
// Exit 0 every test failed for its rule, 1 one did not or a spec has no rule here, 2 the run could not be read.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RULES = [
  { file: 'budget.spec.ts', title: /shifts no more than/, errors: [/cumulative layout shift/] },
  { file: 'budget.spec.ts', title: /bytes of JavaScript or less/, errors: [/start-up JavaScript, gzip bytes/] },
  { file: 'origin.spec.ts', title: /same-origin requests/, errors: [/reached another origin/] },
  { file: 'words.spec.ts', title: /words lint/, errors: [/dash: /, /placeholder: /, /unfilled: /, /banned: /] },
  { file: 'motion.spec.ts', title: /stills everything/, errors: [/running animations/] },
  { file: 'motion.spec.ts', title: /reduced motion/, errors: [/running animations/] },
];

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const run = spawnSync('npx', ['playwright', 'test', '-c', 'tests/fixture/playwright.config.ts', '--reporter=json'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  env: { ...process.env, SITE_DIR: 'bad', SITE_PAGES: '/', SITE_JS_BUDGET: '64', SITE_BANNED: 'forbiddenword' },
});
let report;
try {
  report = JSON.parse(run.stdout);
} catch {
  console.error(`::error::could not read the bad run's report\n${run.stderr}`);
  process.exit(2);
}

// Every test in the report, with its file, title, whether it passed, and its error text with the colour codes stripped.
const specs = (suite) => [
  ...(suite.specs ?? []).map((s) => ({
    file: s.file.split('/').pop(),
    title: s.title,
    ok: s.ok,
    text: s.tests.flatMap((t) => t.results).flatMap((r) => r.errors?.length ? r.errors : r.error ? [r.error] : [])
      .map((e) => e.message ?? e.value ?? '').join('\n').replace(/\u001b\[[0-9;]*m/g, ''),
  })),
  ...(suite.suites ?? []).flatMap(specs),
];
const tests = report.suites.flatMap(specs);
const bad = [];
for (const t of tests) {
  const rule = RULES.find((r) => r.file === t.file && r.title.test(t.title));
  if (!rule) bad.push(`${t.file}: "${t.title}" has no rule in check-bad.mjs`);
  else if (t.ok) bad.push(`${t.file}: "${t.title}" passed on the bad site`);
  else if (!rule.errors.every((re) => re.test(t.text))) bad.push(`${t.file}: "${t.title}" failed for another reason: ${t.text.split('\n').find(Boolean) ?? 'no error text'}`);
}
for (const r of RULES) if (!tests.some((t) => t.file === r.file && r.title.test(t.title))) bad.push(`${r.file}: no test matches ${r.title}`);
const specFiles = readdirSync(new URL('../../templates/tests/', import.meta.url)).filter((f) => f.endsWith('.spec.ts'));
for (const f of specFiles) if (!RULES.some((r) => r.file === f)) bad.push(`${f} has no rule in check-bad.mjs`);
for (const line of bad) console.log(`::error::${line}`);
console.log(`check-bad: ${tests.length - bad.length} of ${tests.length} tests failed on the bad site for their own rule`);
process.exit(bad.length || !tests.length ? 1 : 0);
