// Craft-site rule 4, motion a pause stills (WCAG 2.2 SC 2.2.2). On every page: one button named PAUSE_LABEL. Pressing it
// sets aria-pressed and html[data-motion=paused], and then no animation runs, no video plays and no requestAnimationFrame
// loop keeps going. The choice survives a reload, and a visitor who asks for reduced motion gets a still page.
import { expect, test, type Page } from "@playwright/test";

import { PAGES, PAUSE_LABEL } from "./site";

// Counts requestAnimationFrame callbacks, so a canvas loop that keeps running shows up.
function countFrames() {
  const w = window as unknown as { __frames: number; requestAnimationFrame: typeof requestAnimationFrame };
  w.__frames = 0;
  const raf = w.requestAnimationFrame.bind(window);
  w.requestAnimationFrame = (cb) => raf((t) => (w.__frames++, cb(t)));
}

// The window motion is counted over. Fixed on purpose: a still page is the absence of frames, which no event announces,
// so the test watches for this long. Several frames fit in it at 60 a second.
const WINDOW_MS = 400;

// What still moves over the next WINDOW_MS: running animations, playing videos and animation frames.
async function moving(page: Page) {
  await page.evaluate(() => ((window as unknown as { __frames: number }).__frames = 0));
  await page.waitForTimeout(WINDOW_MS);
  return page.evaluate(() => ({
    animations: document.getAnimations().filter((a) => a.playState === "running").length,
    videos: [...document.querySelectorAll("video")].filter((v) => !v.paused).length,
    frames: (window as unknown as { __frames: number }).__frames,
  }));
}

function expectStill(m: { animations: number; videos: number; frames: number }, path: string) {
  expect(m.animations, `${path} running animations`).toBe(0);
  expect(m.videos, `${path} playing videos`).toBe(0);
  expect(m.frames, `${path} animation frames in ${WINDOW_MS} ms`).toBeLessThanOrEqual(1);
}

for (const path of PAGES) {
  test(`${path}: ${PAUSE_LABEL} stills everything, and the choice is kept`, async ({ page }) => {
    await page.addInitScript(countFrames);
    await page.goto(path, { waitUntil: "load" });
    const button = page.getByRole("button", { name: PAUSE_LABEL, exact: true });
    await expect(button).toHaveCount(1);
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
    expectStill(await moving(page), path);
    await page.reload({ waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
    await expect(button).toHaveAttribute("aria-pressed", "true");
  });

  test(`${path} is still for a visitor who asks for reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(countFrames);
    await page.goto(path, { waitUntil: "load" });
    expectStill(await moving(page), path);
  });
}
