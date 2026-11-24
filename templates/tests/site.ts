// The site the four page tests read (craft-site rules 2 to 5). Copy this folder to tests/e2e/ and edit the values
// below, or set them through the environment in CI. Each spec imports what it needs from here.

// Every page a visitor can open, as paths. SITE_PAGES="/,/about/" overrides the list.
export const PAGES = (process.env.SITE_PAGES ?? "/").split(",").map((p) => p.trim()).filter(Boolean);

// Start-up JavaScript per page, gzip bytes: a goal, craft-site rule 2. SITE_JS_BUDGET overrides it.
export const START_UP_JS_BYTES = Number(process.env.SITE_JS_BUDGET ?? 15 * 1024);

// Cumulative layout shift per page: web.dev's "good" threshold for CLS (web.dev/articles/cls, read 2026-11-24).
export const MAX_CLS = 0.1;

// Hosts a page may reach besides its own origin, each with its reason. Keep it empty unless a host earns its place.
export const ALLOWED_HOSTS: Record<string, string> = {};

// The pause button's accessible name. Its state lives in aria-pressed, so the name never changes.
export const PAUSE_LABEL = "Pause motion";

// The words lint's rules, craft-site rule 5. banned: words your site must never say, matched whole and ignoring case.
// block: a match fails the test. warn: a long sentence adds a warning to the report, and the test passes.
export const WORDS = {
  banned: [] as string[],
  block: [
    { id: "dash", pattern: "[\\u2013\\u2014]", why: "an en or em dash: use a comma, a colon or two sentences" },
    { id: "placeholder", pattern: "\\b(lorem ipsum|todo|tbd|fixme)\\b", why: "placeholder text left on the page" },
    { id: "unfilled", pattern: "\\{\\{|\\}\\}|\\[object Object\\]|\\bNaN\\b", why: "a template value that never filled in" },
  ],
  warn: { max_words: 30, why: "one idea per sentence, under about 30 words" },
};
