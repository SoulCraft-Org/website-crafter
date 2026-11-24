---
name: prompt-fibo
description: How to prompt Bria FIBO 2.0 (text to image) well: its structured JSON caption (VGL), settings, the Space's quirks, and a style block each site fills in. Read before every FIBO render, still or concept, including concept pictures for image-to-3D (Meshy) or image-to-video (LTX).
---

# Prompting FIBO 2.0

FIBO is trained on long structured JSON captions, Bria's **VGL** (Visual Generation Language). A short text prompt
works, but the Space sends it to Bria's prompt writer (`/v2/vgl/generate`), which rewrites it into JSON you did not
choose. For exact control, write the JSON yourself and pass it as `json_prompt`.

## The JSON (VGL)

| Field | Required | Use it for |
|---|---|---|
| `short_description` | yes | The whole picture in one or two sentences, the subject and framing first ("Full-length …, head to tail tip in frame") |
| `background_setting` | yes | The ground: `plain seamless light grey studio backdrop, no floor detail, no props` for a 3D reference |
| `style_medium` | yes | "digital illustration, 3D game character concept", "photograph", … |
| `artistic_style` | no | The style block below |
| `lighting` | yes | `{conditions, direction, shadows}` |
| `aesthetics` | yes | `{composition, mood_atmosphere, color_palette: [[R,G,B], …]}` |
| `photographic_characteristics` | no | `{depth_of_field, focus, camera_angle, lens_focal_length}` |
| `objects[]` | no | One entry per thing: `description`, `bounding_box [x,y,w,h]` (0 to 1), `shape_and_color`, `texture`, `appearance_details`, `relationship`, `orientation`; a person adds `age`, `gender`, `pose`, `expression`, `clothing`, `action` |
| `context`, `text_render[]` | no | Purpose of the image; any lettering |

The fields that steer most (inferred from the schema): `short_description`, `objects`, `style_medium`, `composition`.

## Settings (`briaai/Fibo-2.0-T2I`, `/generate_image`)

| Setting | Value |
|---|---|
| Size | Multiples of 16 near 1 MP. Tall figure: 832×1248. Wide scene: 1248×832 or 1344×768. Space sliders: width 832 to 1344, height 768 to 1248 |
| Steps | Explore at 30; lock the JSON and seed; final at 50. Guidance is fixed at 5.0 |
| Seed | Set it (`randomize=False`). 0 is rejected |
| `style` | `None` for any illustration. The others (Boring Reality, Kodak Film, Hard Flash, Hazy / Dreamy, Lens Distortion) are photographic and swap the hidden negative |
| Negative | Built in and hidden. Say what you want, positively, inside the JSON |
| Editing | `briaai/Fibo-2.0-editing` (Edit Turbo, 4 steps, up to 4 references, optional mask) fixes a picture afterwards; it does not generate one |

## Characters for 3D or video

- One subject, the whole body inside its `bounding_box` with margin on every side, for example `[0.18, 0.03, 0.64, 0.94]`.
- `composition`: "centered, full-length, nothing cropped, margin on all sides". Tall canvas.
- Plain light grey background, soft even light, faint shadows, deep focus: Meshy reads the picture literally.
- A relaxed A-pose with arms off the body; props held clear of the body and inside the frame.
- Name the anatomy in plain words. A naga is "a woman's upper body rising from a long coiled serpent tail", not "a siren".
- Get the picture approved before any 3D or video spend.

## Mistakes

- A photographic `style` on an illustration. A wide canvas for a tall figure. Bounding boxes that touch the edges.
- A stale `json_prompt` after changing the text prompt (the Space reuses the JSON box).
- Stacks of "masterpiece, best quality" (Bria's docs advise against them).
- Describing a creature by its name only ("siren", "naga") and hoping for the anatomy.
- Leaving a hybrid's join open. "A serpent tail from the waist" gave a woman with two scaly leg-tails (2026-11-24).
  Spell out where it joins and how many, in both `short_description` and the figure's `shape_and_color`, such as
  `below the waist her body is one single thick serpent tail, one continuous snake body with no legs and no split, tapering to one tail tip`.

## Your site's style block

Write your art direction once, in one line, and put it unchanged in `artistic_style` on every render. Replace the
placeholder with yours; the example below keeps it:

> `<style block>`: your art direction in one line, such as "flat vector illustration, thick clean outlines, warm two-colour palette"

Original characters only, never one someone else owns. Your site's content limits apply.

## Example: a naga for image-to-3D (832×1248, 50 steps, style None)

```json
{"short_description": "Full-length original naga sea sorceress, head to tail tip fully in frame. Above the waist she is a woman; below the waist her body is one single thick serpent tail, one continuous snake body with no legs and no split, coiling once on the ground and tapering to one tail tip. A full coral-and-gold breastplate covers her chest and stomach; she holds a golden trident upright.",
 "background_setting": "plain seamless light grey studio backdrop, no floor detail, no props",
 "style_medium": "digital illustration, 3D game character concept",
 "artistic_style": "<style block>",
 "context": "character reference for image-to-3D",
 "lighting": {"conditions": "soft even studio light", "direction": "front, slightly above", "shadows": "faint, soft"},
 "aesthetics": {"composition": "centered, full-length, nothing cropped, margin on all sides", "mood_atmosphere": "calm, regal", "color_palette": [[0,150,160],[255,111,97],[230,190,70]]},
 "photographic_characteristics": {"depth_of_field": "deep, all in focus", "focus": "entire figure sharp", "camera_angle": "eye level", "lens_focal_length": "85mm"},
 "objects": [
  {"description": "naga sorceress", "bounding_box": [0.18,0.03,0.64,0.94], "shape_and_color": "human torso joined at the waist to one single continuous teal snake body (no legs, no hips, never two tails) that coils once on the ground and tapers to a single tip", "texture": "hand-painted scales", "orientation": "facing viewer", "pose": "arms slightly away from the body, A-pose", "clothing": "full coral-and-gold breastplate covering chest and stomach, ornate pauldrons", "expression": "serene", "gender": "female"},
  {"description": "golden trident", "bounding_box": [0.74,0.05,0.12,0.85], "shape_and_color": "polished gold", "relationship": "held in her right hand"}]}
```

## Sources (read 2026-11-24)

The Space code of `briaai/Fibo-2.0-T2I` (`app.py`, `styles.py`, `bria_api.py`) and `briaai/Fibo-2.0-editing`;
github.com/Bria-AI/FIBO README; docs.bria.ai `vgl.md`, `image-generation-best-practices.md`,
`whats-new/fibo-2.md`. The model cards are gated and were not read. Marked "inferred" where no source said it.
