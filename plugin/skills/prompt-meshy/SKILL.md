---
name: prompt-meshy
description: How to get a good 3D model from Meshy: the input picture, text and texture prompts, hero or game settings, rigging limits and a style block per site. Read it with the Meshy plugin's meshy-3d-generation skill, which drives the CLI, before any Meshy spend.
---

# Prompting Meshy

Meshy's own plugin (`meshy-3d-generation`, from `meshy-dev/meshy-3d-agent`) runs the CLI: setup, routes, waiting,
downloads. This skill is what goes in: the picture, the prompts, the settings. **The mesh follows the picture**: its
geometry is built from that one view, so a wrong picture gives a faithful wrong model. Fix the picture first
(`prompt-fibo`), get it approved, then spend credits.

## The input picture (image to 3D)

- One subject, whole, nothing cropped; plain light grey or transparent background. Clutter merges into the mesh.
- Soft even light. Hard shadows and dark areas become black patches in the texture.
- Little perspective: a long lens, near orthographic.
- At least 1040 px on the long side (512 is the floor).
- `--image-enhancement false` keeps a clean concept exactly as drawn (standard mode only; the CLI refuses it with smart topology).

## Text prompts (text to 3D, texture prompts)

- Subject, material, art style, then technical limits; key words first; 3 to 6 core details; one object.
- No negative-prompt field: write exclusions into the prompt ("no text").
- Style words that work: "hand painted", "cel-shaded", "stylized". Avoid magic, smoke and particles: they become
  floating fragments.
- `art_style` and `symmetry_mode` are deprecated and do nothing.
- `--texture-prompt` (800 characters) works only with `--texture-model meshy-7`; `meshy-n1` refuses it and paints
  from the picture.

## Hero or game

| Want | Geometry | Texture | Notes |
|---|---|---|---|
| The best look in a viewer | `meshy-7.1` standard | `meshy-7`, PBR, 4k, plus a texture prompt | Huge: 1.7 M triangles in one test (2026-11-24). Simplify it for the web |
| A game character to rig | `meshy-t2.5` smart topology, `--target-polycount` 100 to 30,000 (per docs.meshy.ai `api/image-to-3d`) | `meshy-n1` (2k base colour from the picture) | Use `--pose-mode a-pose` or `t-pose` |

## Rigging limits

Biped or quadruped only, clear limbs, A/T pose, a textured GLB facing +Z. Tails, wings and long robes are not covered
by the docs (inferred: they blur limb detection). A naga is neither biped nor quadruped. Give the concept a clear
torso and two arms, then try the biped rig and inspect the weights. Expect to build the tail chain by hand (Blender
or the engine). Never the quadruped setting.

## Your site's style block

The texture prompt for `meshy-7` is your style block in texture words: its materials, brushwork and colour, and what
it never is ("no photoreal skin"). Replace the placeholder with yours; the commands below keep it:

> `<style block>` texture

With `meshy-n1` the concept picture alone sets the style, so the concept must already be in that style.

## Commands (the approved concept as `naga.png`)

```bash
meshy image-to-3d create --image-url naga.png --model-type standard --texture-model meshy-7 --enable-pbr true --texture-resolution 4k --pose-mode a-pose --image-enhancement false --texture-prompt "<style block> texture" --target-formats glb --async --format json --no-update-check
meshy image-to-3d create --image-url naga.png --model-type smart-topology --target-polycount 15000 --texture-model meshy-n1 --pose-mode a-pose --target-formats glb --async --format json --no-update-check
```

Money: read `meshy balance` before and after; quote only `meshy make --dry-run` estimates; the charge is the task's
`consumed_credits` (one run on 2026-11-24: hero 30, game 15, rig 5).

## Sources (read 2026-11-24)

docs.meshy.ai `api/image-to-3d`, `api/text-to-3d`, `api/models`, `webapp/image-to-3d`, `webapp/guides/prompting`,
`api/rigging-and-animation`; meshy.ai/tutorials/3d-prompt-guide; the meshy-3d-agent skill 0.9.8 and `meshy` 0.8.8
`--help`. Marked "inferred" where no source said it.
