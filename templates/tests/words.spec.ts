// Craft-site rule 5, a words lint on the built page, so text a template generates is caught too. It reads what a visitor
// reads: the page's text, its title and description, and every alt, aria-label and title attribute. A block rule or a
// banned word in site.ts WORDS fails the test; a sentence over WORDS.warn.max_words adds a warning to the report.
import { expect, test } from "@playwright/test";

import { PAGES, WORDS } from "./site";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rules = [
  ...WORDS.block.map((r) => ({ ...r, re: new RegExp(r.pattern, r.flags ?? "giu") })),
  ...WORDS.banned.map((w) => ({ id: "banned", why: `"${w}" is on the banned list`, re: new RegExp(`\\b${escape(w)}\\b`, "giu") })),
];

for (const path of PAGES) {
  test(`${path} passes the words lint`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    const text = await page.evaluate(() => {
      const attrs = [...document.querySelectorAll("[alt], [aria-label], [title]")].flatMap((e) =>
        ["alt", "aria-label", "title"].map((a) => e.getAttribute(a) ?? ""),
      );
      const description = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
      return [document.title, description, document.body.innerText, ...attrs].join("\n");
    });
    const found = rules.flatMap((r) => [...text.matchAll(r.re)].map((m) => `${r.id}: "${m[0]}" (${r.why})`));
    for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
      const words = sentence.split(/\s+/).filter(Boolean).length;
      if (words > WORDS.warn.max_words) test.info().annotations.push({ type: "warning", description: `${words} words: ${sentence.slice(0, 80)}` });
    }
    expect(found, `${path} words`).toEqual([]);
  });
}
