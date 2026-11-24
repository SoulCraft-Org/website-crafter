---
name: prompt-ltx
description: "How to prompt Lightricks LTX-2.5 (image to video, text to video) well: the shot-description paragraph, image-to-video rules, camera words, settings, loops, and a style block each site fills in. Read before every LTX render."
---

# Prompting LTX-2.5

LTX wants a cinematographer's shot description: one flowing, present-tense paragraph of 4 to 8 sentences, under
200 words, where every sentence moves something. Appearance alone gives it nothing to animate.

## The paragraph, in order

1. The main action first, in one literal sentence.
2. Shot and scene: framing (close-up, medium, wide), place, one coherent light source.
3. Action beats: what moves, how fast, in what order. Pace the beats; the model adds no pauses of its own.
4. Characters: physical cues for emotion, never labels. Dialogue in quotation marks.
5. Camera movement, with words it knows: follows, tracks, pans across, circles around, tilts upward, pushes in,
   pulls back, overhead view, handheld, over-the-shoulder, wide establishing shot, static frame. Say how the subject
   looks after the move.
6. Sound, if any.

## Image to video

- Feed a start image already at the output aspect ratio; the Space centre-crops.
- Do not re-describe the picture. Name the subject once in the picture's own words, then write only motion and
  camera. This keeps a character on-model (inferred; the Space's own examples are motion only).
- Keep motion simple and physical. Chaotic physics, crowds and mixed lighting cause morphing.

## Settings (`Lightricks/LTX-2.5` Space; ComfyUI)

| Setting | Value |
|---|---|
| Size | Width and height divisible by 32; image-to-video pins the short side at 832 |
| Frames | 8n+1 at 24 fps: 5 s is 121 frames (`round(s*24)//8*8+1`) |
| Model | The Space is the distilled model: 8 + 3 steps, guidance 1.0, seed random unless set |
| Enhance prompt | On by default (a Gemma rewrite). Turn it off when the paragraph already follows this guide, and always for a loop: a rewrite can add cuts or big motion |
| Auto length | Off, for a fixed 5 s |
| Negative | The Space has no negative field and hard-codes a default that includes "cartoonish rendering, 3D CGI look": it works against a stylized look. In ComfyUI with the full model, use your own negative (below) and leave those words out |

## A loop with no visible seam (inferred; no source documents looping)

Slow cyclic motion only (drift, sway, a pulsing glow); "returns to the starting pose"; a camera orbit of a few
degrees that eases back. Render several seeds, keep the one whose last frame best matches its first, then crossfade
the last half second into the start, or play it forward then reversed.

## Your site's style block

Name the look once, in the words of your FIBO style block, then keep it unchanged. Replace the placeholder with
yours; the example below keeps it:

> her `<style block>` look unchanged

Original characters only. Your site's content limits apply.

## Example: a 5 s hero loop from an approved naga picture (enhance off)

> A medium shot of the naga sea sorceress from the image idles in place, her
> `<style block>` look unchanged. Her long serpent tail slowly coils and uncoils in a gentle loop, scales
> catching soft light. Her flowing hair and translucent fins drift and sway as if underwater, rising and settling in
> a slow rhythm. The crystal of her trident pulses with a soft turquoise glow, brightening and dimming evenly while
> she holds it steady. Tiny bubbles rise past her. The camera slowly orbits a few degrees around her, then eases back
> to the starting angle, and her pose returns to the opening position. Calm, ambient underwater hum.

Negative, guided pipelines only:

```text
blurry, flickering, jitter, camera shake, fast motion, scene cut, zoom, new objects, extra limbs, extra heads, deformed face, fused fingers, changing outfit, changing colours, washed out colours, low contrast, photorealistic skin, text, watermark, logo
```

## Sources (read 2026-11-24)

ltx.io/blog/ltx-2-5-prompt-guide (Lightricks, 2026-08-10); ltx.io/blog/prompting-guide-for-ltx-2;
github.com/Lightricks/LTX-2 README; huggingface.co/Lightricks/LTX-2 README; the `Lightricks/LTX-2.5` Space's
`app.py`; diffusers `pipelines/ltx2/utils.py` (the default negative). The LTX-2.5 model card is gated and
docs.ltx.video refused the fetch. Marked "inferred" where no source said it.
