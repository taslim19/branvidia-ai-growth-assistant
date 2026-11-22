# Design plan: Branvidia AI Growth Assistant

Process note: written before any code, per the frontend-design skill (plan, review against the brief and the "avoid generic tells" list, revise, then build). The brief pins the palette, type, shape and layout, so those axes are fixed by the client's own words; the review below covers the axes the brief leaves free.

## Subject, audience, job

A trustworthy growth tool for small-business owners in India (cafés, salons, shops). Audience: busy owners, not designers. Primary job: get an owner from "what is this?" to chatting with the assistant in under ten seconds, then carry them to an honest, readable optimization report.

## Color (4-6 named hex values, from the brief)

- Branvidia Violet `#5B21B6`: actions, score ring, focus ring
- Violet Mist `#F3EFFB`: soft surfaces (chips, tinted panels)
- Paper `#FAFAFC`: page background
- Ink `#16151D`: primary text (never pure black)
- Slate `#6B6880`: secondary text
- Status set: Success `#15803D`, Warning `#B45309`, Danger `#B91C1C`, each with a pale tint reserved for badges only

Dark theme: same roles, surfaces shift to `#131118` page / `#1C1A26` card / `#262136` mist, text `#F4F3F8` / `#A5A2B8`, violet actions keep `#5B21B6` (white text passes 4.5:1 on it in both themes). All values live in `globals.css` CSS variables and `tailwind.config.ts` only.

## Type

- Poppins 600/700: headings, score number, step labels
- Inter 400/500/600: body, inputs, chips, badges
- Scale 14 / 16 / 20 / 28 / 40. Body lines capped under 70 characters. Sentence case everywhere, including buttons and badges.

## Layout

Left-aligned, generous whitespace, 8px grid. One idea per section, no decorative dividers.

Landing hero wireframe (one line):

```
[Branvidia logo        Assistant · Dashboard · theme]   <- quiet header
| Headline (28/40)      |  +-----------------------+  |
| one sentence of value |  | assistant: first q    |  |
| "See a sample report" |  | user chip replies     |  |
|                       |  | [chip][chip]  [input_]|  |
+-----------------------+---------------------------+
What the assistant does (3 short rows, no card grid)
What it will and will not access (two plain lists)
Footer: contact@branvidia.com, +91 63614 27326
```

The chat panel is the hero's right half and the only lifted (shadowed) element on the page; everything else sits on borders and whitespace.

Report wireframe:

```
+---------------------------------------------------+
| (sticky left column, desktop)     | 8 sections as |
|  score ring + breakdown + Export  | one document  |
+-----------------------------------+----------------+
Mobile: ring first, then sections stacked.
```

## Three principles

1. The product is the pitch: a visitor's first impression is the assistant already asking its first question, not a stock illustration or a marketing claim.
2. One loud element per screen: the chat panel on the landing and the score ring on the report; everything else stays quiet, bordered, and left-aligned.
3. Plain words do the work: every button says exactly what happens, every empty state says what to do next, no cleverness a busy owner has to decode.

## Review against the generic-tells list (and what changed)

- All-caps tracked eyebrow labels: not used; section headings are plain Poppins sentence case.
- A single accented word in a headline: not used; the headline is one weight, one color.
- 01/02/03 markers: used only where the content really is a sequence: the 10-step flow progress and the prioritized next-steps list.
- "A · B · C" meta strings: not used.
- Arrows on every button: not used; icons appear only where they add meaning (lock/shield on consent screens, severity icons in the report).
- Identical rounded cards stacked: avoided: radius varies by role (pill chips/buttons, 16px cards, 12px inputs), sections in the report are separated by spacing and a single hairline, not repeated card chrome.
- Scroll fade-in on every section: not used; motion only answers an action (message appears, step completes, ring fills once, modal opens), 150–250ms, `prefers-reduced-motion` respected.
- Cream/terracotta, neon-on-black, purple-to-pink gradient washes: none; palette is the client's fixed set above.

Revised while reviewing: the first sketch had the three "what the assistant does" points as icon cards, then cut them to plain rows after the Chanel check ("remove one decorative element"), nothing was lost. The hero originally repeated the step progress under the panel: removed; the compact step indicator lives inside the chat header only.
