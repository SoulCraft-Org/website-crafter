// Craft-site rule 2, the start-up budget. On every page in site.ts: the layout shifts no more than MAX_CLS, and the
// JavaScript the page needs to start is START_UP_JS_BYTES gzip or less. Start-up JavaScript is every inline script, every
// same-origin script the HTML names or preloads, and every module those import statically, by a relative or a
// root-relative path. A module a dynamic import() loads when its section nears the screen is the lazy part, so it is
// not counted.
import { gzipSync } from "node:zlib";
import { expect, test, type APIRequestContext } from "@playwright/test";

import { MAX_CLS, PAGES, START_UP_JS_BYTES } from "./site";

// The scroll's pace, and a quiet window after the network settles: a late shift (a font swap, a lazy picture without
// its box) lands inside it. These are fixed on purpose; CLS has no event that says "no more shifts are coming".
const STEP_MS = 80;
const QUIET_MS = 500;

for (const path of PAGES) {
  test(`${path} shifts no more than ${MAX_CLS}`, async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!e.hadRecentInput) w.__cls += e.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(path, { waitUntil: "load" });
    await walk(page);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls, `${path} cumulative layout shift`).toBeLessThanOrEqual(MAX_CLS);
  });

  test(`${path} starts on ${START_UP_JS_BYTES} bytes of JavaScript or less (gzip)`, async ({ page, request, baseURL }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const html = await page.content();
    const base = new URL(path, baseURL);
    let total = 0;
    const queue: URL[] = [];
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/type="application\/(ld\+)?json"/.test(m[1])) continue;
      const src = /\bsrc="([^"]+)"/.exec(m[1])?.[1];
      if (src) queue.push(new URL(src, base));
      else total += gzipSync(m[2]).length;
    }
    // A script the page preloads is start-up code too: rel="modulepreload", or rel="preload" with as="script".
    for (const [tag] of html.matchAll(/<link\b[^>]*>/g)) {
      const rel = /\brel="([^"]+)"/.exec(tag)?.[1] ?? "";
      const href = /\bhref="([^"]+)"/.exec(tag)?.[1];
      if (href && (rel === "modulepreload" || (rel === "preload" && /\bas="script"/.test(tag)))) queue.push(new URL(href, base));
    }
    const seen = new Set<string>();
    while (queue.length) {
      const u = queue.pop()!;
      if (u.origin !== base.origin || seen.has(u.href)) continue;
      seen.add(u.href);
      const body = await fetchText(request, u.href);
      total += gzipSync(body).length;
      // Static imports only: `from "./x.js"`, `import "/assets/x.js"`. import("./x.js") has a parenthesis: it is lazy.
      for (const im of body.matchAll(/(?:from|import)\s*["']((?:\.{1,2})?\/[^"']+\.js)["']/g)) queue.push(new URL(im[1], u));
    }
    expect(total, `${path} start-up JavaScript, gzip bytes`).toBeLessThanOrEqual(START_UP_JS_BYTES);
  });
}

// Scrolls the whole page and back, so lazy images, loops and demos have their chance to move something.
async function walk(page: import("@playwright/test").Page) {
  await page.evaluate(async (step) => {
    for (let y = 0; y <= document.documentElement.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, step));
    }
    scrollTo(0, 0);
  }, STEP_MS);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(QUIET_MS);
}

async function fetchText(request: APIRequestContext, url: string): Promise<string> {
  const res = await request.get(url);
  expect(res.ok(), url).toBe(true);
  return await res.text();
}
