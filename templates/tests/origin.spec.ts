// Craft-site rule 3, no third-party requests. Every request a page makes (document, scripts, styles, fonts, images,
// video, fetches) goes to the site's own origin, or to a host in site.ts ALLOWED_HOSTS. The page is walked top to bottom
// first, so lazy images and demos load too.
import { expect, test } from "@playwright/test";

import { ALLOWED_HOSTS, PAGES } from "./site";

for (const path of PAGES) {
  test(`${path} makes only same-origin requests`, async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const foreign: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (/^(data|blob|about):/.test(url)) return;
      const u = new URL(url);
      if (u.origin !== origin && !(u.hostname in ALLOWED_HOSTS)) foreign.push(url);
    });
    await page.goto(path, { waitUntil: "load" });
    await page.evaluate(async () => {
      for (let y = 0; y <= document.documentElement.scrollHeight; y += Math.max(200, innerHeight / 2)) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      scrollTo(0, 0);
    });
    await page.waitForLoadState("networkidle");
    expect(foreign, `${path} reached another origin`).toEqual([]);
  });
}
