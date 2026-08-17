---
name: PyLearn
description: A pressable path of stones you can see yourself moving along — vivid growth green on near-white, everything solid-edged and sinkable.
colors:
  surface: "#faf9f9"
  surface-lowest: "#ffffff"
  surface-low: "#f4f3f3"
  surface-container: "#eeeeed"
  surface-high: "#e9e8e8"
  surface-highest: "#e3e2e2"
  surface-dim: "#dadada"
  on-surface: "#1a1c1c"
  on-surface-variant: "#3f4a36"
  outline: "#6f7b64"
  outline-variant: "#becbb1"
  primary: "#2b6c00"
  on-primary: "#ffffff"
  primary-container: "#58cc02"
  on-primary-container: "#1e5000"
  primary-edge: "#46a302"
  secondary-container: "#fec700"
  on-secondary-container: "#6e5400"
  secondary-fixed: "#ffdf92"
  on-secondary-fixed: "#241a00"
  secondary-edge: "#d9a000"
  tertiary: "#006590"
  tertiary-container: "#4abdff"
  on-tertiary-container: "#004a6b"
  tertiary-edge: "#2b93c9"
  error: "#ba1a1a"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  locked-edge: "#c2c1c1"
  wash-green: "#eefce4"
  wash-green-quiet: "#f2fce9"
  wash-blue: "#eaf7ff"
  nav-glass: "rgba(252, 253, 251, 0.62)"
  nav-glass-solid: "rgba(252, 253, 251, 0.9)"
  nav-hairline: "rgba(255, 255, 255, 0.75)"
  nav-tab-wash: "rgba(88, 204, 2, 0.18)"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: "32px"
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: "28px"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    lineHeight: "24px"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "24px"
  label:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    letterSpacing: "0.02em"
  micro:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: "14px"
  code:
    fontFamily: "SF Mono, ui-monospace, Menlo, Consolas, monospace"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "22px"
rounded:
  sm: "8px"
  md: "16px"
  tab: "24px"
  nav: "30px"
  lg: "32px"
  pill: "999px"
  circle: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  "2xl": "24px"
  path-step: "128px"
  path-swing: "58px"
components:
  button-primary:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "52px"
    width: "100%"
  button-primary-disabled:
    backgroundColor: "{colors.surface-highest}"
    textColor: "#8b8f8b"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-fixed}"
    rounded: "{rounded.md}"
  button-tertiary:
    backgroundColor: "{colors.tertiary-container}"
    textColor: "{colors.on-tertiary-container}"
    rounded: "{rounded.md}"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-ghost:
    backgroundColor: "{colors.surface-lowest}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.md}"
  path-node:
    backgroundColor: "{colors.surface-highest}"
    textColor: "#9a9a9a"
    rounded: "{rounded.circle}"
    size: "76px"
  path-node-active:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.circle}"
    size: "76px"
  path-node-done:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    rounded: "{rounded.circle}"
    size: "76px"
  unit-card:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary}"
    typography: "{typography.headline}"
    rounded: "{rounded.md}"
    padding: "24px"
    height: "128px"
  answer-tile:
    backgroundColor: "{colors.surface-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.code}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "56px"
  answer-tile-selected:
    backgroundColor: "{colors.wash-blue}"
    textColor: "{colors.on-tertiary-container}"
    rounded: "{rounded.md}"
  answer-tile-correct:
    backgroundColor: "{colors.wash-green}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.md}"
  answer-tile-wrong:
    backgroundColor: "{colors.error-container}"
    textColor: "{colors.on-error-container}"
    rounded: "{rounded.md}"
  chip:
    backgroundColor: "{colors.surface-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.code}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "46px"
  list-row:
    backgroundColor: "{colors.surface-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    height: "60px"
  nav-bar:
    backgroundColor: "{colors.nav-glass}"
    rounded: "{rounded.nav}"
    padding: "7px"
  nav-tab-active:
    backgroundColor: "{colors.nav-tab-wash}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.tab}"
    height: "50px"
  cheer-bubble:
    backgroundColor: "{colors.surface-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    width: "168px"
  gem-pill:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-fixed}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "40px"
---

# Design System: PyLearn

## Overview

**Creative North Star: "The Garden Path"**

PyLearn's course surfaces are built as a route through a garden rather than a list
of lessons. The winding track of stepping stones is the product's spine: a ribbon
of smooth S-curves swings the stones off the centre line so the eye reads a walk
rather than a table of contents, the stone you are standing on wears a progress
ring and is cheered on from the outside of the curve, and everything behind it has
already turned gold. The palette is a growing thing — vivid growth green as the
only "go" colour, energy yellow for what has been earned, wisdom blue for what can
be spent — laid on a warm near-white that never competes.

Everything you can touch is a physical object. Depth in this system is isometric
and hard-edged: an interactive element sits on a solid, unblurred bottom edge in
a darker tone of its own fill, and pressing it collapses that edge to nothing
while the object drops by exactly the edge's height. Content does not float, does
not glow and casts no soft ambient shadow. This is the pinned world's signature
and the reason the surfaces feel pressable rather than clickable. Exactly one
class of object is exempt: the things that ride *above* the path rather than
sitting on it — the floating glass tab pill and the encouragement bubble — and
they earn their soft shadow by being separated from the surface, not by being
decorative.

Density is generous and thumb-first. The whole product renders inside a 420px
phone frame standing in for a native app, so touch targets never fall below 40px.
The stat bar is docked to the top of every course screen; the four tabs travel
below it as a floating pill inset from the frame's edges, so the path is visible
running underneath them. The type is loud where it counts
(Plus Jakarta Sans at weight 800 for anything that names a place) and quiet
everywhere else (Be Vietnam Pro at 500 for prose, 700 for labels). Python is
always set in mono, including inside answer tiles, so code never reads as UI copy.

**Key Characteristics:**
- Solid, unblurred bottom edges (2/3/4/6px) on every pressable object; press collapses the edge
- Maximum roundness: 16px on surfaces, 32px on large panels, full circles on stones and avatars
- 2px defining borders on content, 4px on fixed chrome edges
- One green with one job: growth green means "go here next"
- A near-white ground (#faf9f9) that lets three saturated hues carry all the meaning
- Material Symbols Rounded for every icon; no emoji, no glyph substitutes
- A winding stepping-stone path in place of any lesson list — curve and stones generated from one shared table
- One floating element per screen: the frosted-glass tab pill, inset 14px from the frame
- A visible focus ring (3px wisdom blue) and a reduced-motion opt-out on every course surface

## Colors

A saturated three-hue signal set — green, yellow, blue — sitting on a warm
near-white with a green-tinted neutral ramp, so even the greys belong to the
garden.

### Primary
- **Growth Green** (`primary-container`, #58cc02): the only "go" colour. Fills the unit card, the active stone, the primary button, the lesson progress bar, the progress chart bars — and, thinned to an 18% wash (`nav-tab-wash`), marks the active tab inside the glass pill. If something is the next thing to do, it is this green.
- **Deep Leaf** (`primary`, #2b6c00): never a fill. Reserved for green text that must clear contrast on light washes.
- **Green Edge** (`primary-edge`, #46a302): the solid bottom edge under every green object. It exists only as depth.
- **Green Ink** (`on-primary-container`, #1e5000): text on the pale green washes (correct answers, positive feedback).

### Secondary
- **Energy Yellow** (`secondary-container`, #fec700): what has been earned or ranked. Completed stones, the gem pill, first place, the gem counter's own ring.
- **Honey Fixed** (`secondary-fixed`, #ffdf92): the reward chest at the end of the path — softer than the earned-gold so the goal reads as promised rather than banked.
- **Yellow Edge** (`secondary-edge`, #d9a000): the bottom edge under gold objects; also the fill colour of earned achievement icons.

### Tertiary
- **Wisdom Blue** (`tertiary-container`, #4abdff): choice and currency. Selected answer tiles, the blue button, gem-flavoured accents.
- **Deep Water** (`tertiary`, #006590): blue as ink — the gem stat in the top bar, shop item art, the preview caption.

### Neutral
- **Warm Near-White** (`surface`, #faf9f9): the ground under every course screen and both chrome bars.
- **Card White** (`surface-lowest`, #ffffff): every raised content surface — tiles, chips, rows, stat cards, the speech bubble.
- **Quiet Greys** (`surface-low` #f4f3f3 → `surface-dim` #dadada): a five-step ramp used for hover fills, borders, the unfinished path track, locked stones and disabled edges. `surface-highest` (#e3e2e2) is the workhorse: it is simultaneously the default 2px border, the chrome divider, the empty progress track and the locked stone fill.
- **Near-Black Ink** (`on-surface`, #1a1c1c) and **Moss Ink** (`on-surface-variant`, #3f4a36): body text and secondary text. The secondary ink is green-tinted, not grey.
- **Sage Outline** (`outline` #6f7b64, `outline-variant` #becbb1): the quiet-but-legible text colour for placeholder prompts, and the dashed border of the honesty banner.

### Glass
- **Nav Glass** (`nav-glass`, rgba(252,253,251,0.62)): the tab pill's fill where `backdrop-filter` is supported, with **Nav Glass Solid** (`nav-glass-solid`, rgba(252,253,251,0.9)) as the near-opaque fallback outside the `@supports` guard. The two are the same near-white at two opacities; the blur, not the colour, is what does the work.
- **Nav Hairline** (`nav-hairline`, rgba(255,255,255,0.75)): the 1px lit rim around the pill. White-on-white is the whole point — it separates glass from ground without drawing a border.

### Error
- **Alert Red** (`error`, #ba1a1a) with **Blush** (`error-container`, #ffdad6) and **Deep Red Ink** (`on-error-container`, #93000a): hearts, wrong answers, the wrong-answer feedback sheet, and the destructive button.

### Named Rules
**The Container Speaks Rule.** The mid-tone container colours (#58cc02, #fec700, #4abdff) are the only fills. Their darker siblings (`primary`, `tertiary`, the `-edge` tokens) exist as ink and as depth and must never become a background.

**The Three Meters Rule.** Streak is amber (#b07d00), gems are wisdom blue, hearts are alert red. These three assignments are fixed across the top bar, the lesson chrome and the result screen; a meter never borrows another meter's colour.

**The One Green Rule.** Growth green marks exactly one destination per screen. On the path, only the current stone is green — completed stones are gold, locked stones are grey. If two greens compete for "next", one of them is wrong.

## Typography

**Display Font:** Plus Jakarta Sans (700/800, with ui-sans-serif, system-ui fallbacks)
**Body Font:** Be Vietnam Pro (500/700, with ui-sans-serif, system-ui fallbacks)
**Mono Font:** SF Mono / ui-monospace / Menlo / Consolas
**Icon Font:** Material Symbols Rounded (variable: FILL 0–1, wght 500, opsz 24)

**Character:** Jakarta's geometric, slightly condensed heaviness makes headings feel like signage on the path; Be Vietnam Pro is rounder and warmer at reading size, so instructions never sound like the same voice as the destination markers. The pairing only ever appears at two weights each, which is what keeps a screen full of saturated colour from also feeling typographically noisy.

### Hierarchy
- **Display** (Jakarta 800, 26px/32px, -0.01em): screen titles — "Progress", "Snake Shop", "Lesson complete!".
- **Headline** (Jakarta 800, 22px/28px): the unit card's title, and the big numerals in stat cards.
- **Title** (Jakarta 800, 19–21px): the fixed header title on customize/shop, the exercise prompt (21px/28px), the feedback sheet's verdict (20px), the profile name (20px).
- **Section** (Jakarta 800, 17px): in-page section headings — "Topics", "Achievements", "Your snake".
- **Body** (Be Vietnam Pro 500, 16px/24px): the screen default; also the speech bubble (16px/23px).
- **Sub** (Be Vietnam Pro 500, 15px): the line under a screen title, in moss ink.
- **Label** (Be Vietnam Pro 700, 13–15px): buttons (15px, 0.02em, uppercase), list rows, stat pills, tabs, prices.
- **Micro** (Be Vietnam Pro 700, 10–12px): stone captions (12px/15px), nav tab labels (11px), achievement captions (11px/14px), the "Premium" badge (10px, 0.06em, uppercase).
- **Code** (mono 500, 15px/22px): the code block, every answer tile, every word-bank chip.

### Named Rules
**The Two Weights Rule.** Jakarta appears at 800 only; Be Vietnam Pro at 700 for labels and 500 for prose. There is no 600, no 400, and no italic anywhere in the system.

**The Code Is Mono Rule.** Any string of Python is set in the mono stack, including when it is the label of a pressable answer tile or word-bank chip. Never set code in the body face to make a tile look tidier.

**The Uppercase Is For Commitment Rule.** Only two things are uppercased: primary action buttons (0.02em) and the "Premium" badge (0.06em). Headings, tabs and nav labels stay sentence case.

## Layout

Every screen renders inside a phone frame (`.phone-shell`, max 420px wide, up to 860px tall, 30px radius) that goes full-bleed and square-cornered below 420px. The design comp is 390px; treat 390–420px as the design width and everything narrower as the same layout with the frame chrome removed.

Course screens are a single scrolling column with 20px side gutters. The scroll region carries fixed insets rather than the chrome being sticky: 84px of top padding clears the 68px stat bar and its 4px divider, and 116px of bottom padding clears the floating tab pill and the air beneath it. Both chrome elements are absolutely positioned at z-index 50; the lesson feedback sheet rises above them at z-index 60. The tab pill is inset 14px from the left, right and bottom edges of the frame, with `env(safe-area-inset-bottom)` added to the bottom offset. Scrollbars are hidden on course screens — the path is meant to feel like a surface you drag, not a document.

The vertical rhythm is a small even ladder — 4, 8, 10, 12, 14, 16, 20, 22, 24px — with three deliberate exceptions: the unit card is followed by 40px of air, the path advances 128px per stone (`path-step`), and stone captions hang 12px below their stone. Grids are fixed-count, not fluid: 3 columns for cosmetic swatches, achievements and profile stats; 2 columns for shop items and result stat cards; 10–14px gaps.

The path has its own coordinate system, separate from the gutter rhythm: a fixed 320px-wide space pinned to the container's centre line (`left: 50%`, `margin-left: -160px`). Every stone centre and every curve control point is computed inside it, so the ribbon and the stones cannot drift apart when the frame width changes.

Touch targets never go below 40px. Buttons and stones are 52px and 76px respectively; icon buttons are 44px circles; stat pills and tabs are 40–44px.

### Named Rules
**The Chrome Never Scrolls Rule.** The stat bar and the tab pill are fixed to the frame; content is padded out from under them (84px top, 116px bottom) and never comes to rest beneath them. The stat bar is docked and separated by a 4px divider; the tab pill is detached and separated by 14px of visible ground on three sides. Neither is ever made sticky inside the scroll region.

**The One Coordinate Space Rule.** The path's curve and its stones are generated from one shared table (`PATH_W` 320, `PATH_TOP` 48, `PATH_STEP` 128, `PATH_SWING`, `pathX`, `pathY`, `buildTrack` in `src/App.tsx`). Never position a stone with a number the curve does not also use; two tables drift the moment the container resizes.

## Elevation & Depth

Content in this system has no ambient shadows. Depth is isometric and literal: an object sits on a solid, zero-blur bottom edge (`box-shadow: 0 Npx 0 0 <darker tone>`) drawn in a darker tone of its own fill, and pressing it translates the object down by exactly N pixels while the edge collapses to zero. The transition is 100ms ease on transform and box-shadow, so the sink reads as physical contact rather than animation. Cards that are not pressable get the same silhouette a cheaper way: a 2px border with `border-bottom-width: 4px`.

There is a second, strictly bounded depth register for the things that ride *above* the scrolling surface rather than resting on it. Those get soft, layered shadows and — in the tab pill's case — a real backdrop blur, because their job is to be read as a separate plane of glass with content moving underneath. Two elements qualify in the build: the floating tab pill and the encouragement bubble. Nothing that scrolls with the page may borrow this register.

The edge height is a rank. 6px is reserved for the stones on the path, the largest objects in the system; 4px is the standard for buttons, the unit card and card bottoms; 3px for the small shop buy button; 2px for answer tiles and word-bank chips, which sink only slightly because they are chosen, not committed to.

### Shadow Vocabulary
- **Stone edge** (`box-shadow: 0 6px 0 0 <edge tone>`): path stones and the goal chest. Press → `0 0 0 0` + `translateY(6px)`.
- **Object edge** (`box-shadow: 0 4px 0 0 <edge tone>`): primary/secondary/tertiary/danger/ghost buttons, the unit card. Press → `0 0 0 0` + `translateY(4px)`.
- **Small edge** (`box-shadow: 0 3px 0 0 <edge tone>`): the shop's buy button.
- **Selection edge** (`box-shadow: 0 2px 0 0 <edge tone>`): answer tiles and chips; the edge tone changes with state (grey → blue → green → red).
- **Card lip** (`border-bottom-width: 4px` on a 2px border): list rows, stat cards, achievement tiles, shop items, swatches, the chart, the profile card, the snake preview. The non-pressable version of the same idea.
- **Inner light** (`box-shadow: inset 0 2px 4px rgba(255,255,255,0.45)`): only on the lesson progress fill and the progress chart bars, to make a filled bar read as rounded plastic.
- **Floating glass** (`box-shadow: 0 10px 30px rgba(26,58,18,0.16), 0 2px 8px rgba(31,41,55,0.08), inset 0 1px 0 rgba(255,255,255,0.9)`): the tab pill only. A wide green-tinted cast so the pill's shadow belongs to the garden, a tight neutral contact shadow underneath it, and an inset top highlight that lights the glass from above.
- **Floating card** (`box-shadow: 0 6px 16px rgba(31,41,55,0.1)`): the encouragement bubble only — the quieter member of the same register.

### Named Rules
**The Solid Edge Rule.** Depth on anything that scrolls is a zero-blur offset in a darker tone of the object's own fill. No blurred shadows, no glows, no `rgba` black scrims on content.

**The One Floating Plane Rule.** Soft shadows and backdrop blur belong exclusively to elements that sit above the scroll and let content pass underneath — in this build, the tab pill and the encouragement bubble. Adding a third is a decision about the product's spatial model, not a styling choice.

**The Sink Equals Edge Rule.** The press translation always equals the edge height exactly (6/6, 4/4, 3/3, 2/2). A press that moves further than its edge, or that leaves an edge behind, is broken.

## Shapes

Roundness is pushed to the top of what each object can carry. Content surfaces — buttons, cards, tiles, chips, list rows, the code block, the speech bubble, the encouragement bubble — are 16px. Large panels — the snake preview stage, the profile card — are 32px. The floating tab pill is 30px on a 64px-tall body, with its tabs cut as 24px lozenges inside it, so the inner shape echoes the outer without touching it. Small chrome — stat pills, item art, the preview caption — is 8px. Anything that is a status or a count is a full pill (999px): the gem pill, cosmetic tabs, the "Premium" badge, progress tracks and bar caps. Anything that represents a being or a place is a full circle: path stones, avatars, the mascot frame, rank medallions, icon buttons, colour dots.

Borders are structural, not decorative. 2px is the defining border on every content surface; 4px appears only twice — as the divider under the stat bar, and as the bottom lip of a card. Stones carry a 4px border in the background colour itself, which cuts them out of the ribbon running behind them. Two borders are exceptions to the 2px content rule: the honesty banner is 2px dashed sage, and the floating tab pill is a 1px translucent white hairline — the only 1px border in the system, and it exists to catch light on glass rather than to define an edge.

The path's own geometry: an SVG ribbon of smooth vertical cubic S-curves (12px stroke in `surface-highest`, round caps, no fill) drawn behind the stones inside the 320px path space. Stones advance 128px down and swing across on a four-beat — centred, +58px right, centred, −58px left — and both the curve's control points and the stones' absolute positions read that same swing table. Each curve segment places both control points at the segment's vertical midpoint, which is what makes the crossings symmetrical and keeps the ribbon vertical as it passes through a stone. The offset is applied to the stone's wrapper, so the progress ring, the caption and the encouragement bubble all travel with the stone.

### Named Rules
**The Two-Pixel Border Rule.** Content borders are 2px. 4px is reserved for the stat-bar divider, card bottom lips and the stones' cut-out ring; 1px exists once, on the glass pill. Nothing else may introduce a new border weight.

**The Threaded Ribbon Rule.** The track passes *through* the stones, never behind a gap: it is stroked from the same centres the stones are positioned from, and the stones' 4px surface-coloured border is what punches them out of it. A track drawn as a straight bar behind offset stones is the thing this geometry replaced.

## Components

### Buttons
- **Shape:** fully rounded corners (16px), full width, 52px minimum height, 15px uppercase label at 0.02em.
- **Primary:** growth green fill, white label, 4px green edge. The one committing action on a screen.
- **Secondary / Tertiary / Danger:** energy yellow with dark honey ink, wisdom blue with deep water ink, alert red with white — each on its own matching 4px edge. Danger is used for "continue" after a wrong answer, so the sheet and its button read as one object.
- **Ghost:** white fill, 2px `surface-highest` border, grey edge, moss ink. Used for secondary navigation (sign out, "browse the shop").
- **Hover:** `filter: brightness(1.05)` only — the geometry does not change until press.
- **Press:** `translateY(4px)` with the edge collapsed to zero.
- **Disabled:** `surface-highest` fill, dim grey edge, #8b8f8b label, cursor not-allowed. Disabled buttons keep their edge — they look solid, just spent.
- **Icon button:** 44px transparent circle, moss ink, fills with `surface-high` on hover. No edge, because it is chrome rather than an object.

### Path Stones (signature component)
The system's defining component. A 76px circle with a 4px surface-coloured border that punches it out of the ribbon behind it, a 36px Material Symbol at its centre, a 6px bottom edge, and a 132px caption hanging 12px below. Stones are absolutely positioned from `pathX`/`pathY` — never laid out in flow — and the wrapper is offset by `pathX(i) − centre` so everything attached to the stone moves with it.
- **Locked:** `surface-highest` fill, #9a9a9a lock icon, `locked-edge` bottom, disabled, caption reads "Locked".
- **Current:** growth green fill, white lesson icon, green edge, and — only here — an SVG progress ring inset −9px, 7px stroke, `surface-highest` track with a #58cc02 round-capped arc showing questions answered.
- **Complete:** energy yellow fill, star icon, yellow edge.
- **Goal chest:** the terminal node — 88px, 16px radius instead of a circle, honey fill, locked until every stone is cleared. It occupies the next slot in the same table, so the ribbon runs into it like any other stop.

### Encouragement Bubble (signature component)
A 168px white card pinned to the side of the live stone, always on the **outside** of the curve: it takes `vg-cheer-left` when the stone swings right and `vg-cheer-right` when it swings left, so it never covers the stone above. Vertically centred on the stone by margin (`top: 50%; margin-top: -33px`), leaving `transform` free for a 2.6s idle bob of −5px. 16px radius, 2px `surface-highest` border, the logo mark at 28px beside 13px/17px bold copy, and a soft `0 6px 16px rgba(31,41,55,0.1)` lift. The tail is two stacked CSS wedges — a 12px border-coloured one and a 10px fill-coloured one offset 3px over it — so the 2px border appears to wrap around the point. It is `pointer-events: none`: encouragement, not a control. Only ever one per screen, on the current stone.

### Cards / Containers
- **Unit card:** growth green, 16px radius, 128px minimum height, 24px padding, white type, 4px green edge, with the logo mark bled off the bottom-right corner at 22% opacity and 118px wide. It is the only full-bleed colour field on the home screen.
- **List row:** white, 16px radius, 2px border with a 4px bottom lip, 60px minimum, 12px gaps, icon + name + trailing value. As a `<button>` it gains a hover fill and a 2px sink (the lip shrinks 4px → 2px). The "you" variant takes a green border and a #f2fce9 wash.
- **Stat / achievement / shop tiles:** the same white + 2px border + 4px lip formula at three densities. Shop art is a 96px `surface-low` panel with a 52px blue symbol that scales to 1.12 on hover.
- **Snake preview stage:** 260px, 32px radius, pale blue (#c8e6ff) with a 20px dotted grid at 20% opacity, the snake floating on a 3.2s loop with a soft blue drop shadow — the one place a blurred shadow is allowed, because the subject is airborne rather than pressable.

### Answer Tiles & Chips
- **Tile:** white, 2px border, 2px edge, 56px minimum, mono label, left-aligned. States repaint border, fill and edge together: selected → wisdom blue on #eaf7ff; correct → growth green on #eefce4; wrong → alert red on blush.
- **Chip (word bank):** the same treatment as a 46px pill-padded box. A used chip flattens completely — `surface-container` fill, no edge, transparent text — so the gap it leaves is visible but not clickable.
- **Drop zone:** a 64px area closed by a 2px bottom rule, with sage placeholder text rather than a tinted box.

### Navigation
- **Top stat bar:** 68px, surface-coloured, closed by a 4px `surface-highest` divider. Three transparent stat pills: streak in amber, gems in blue, hearts in red, each 24px icon + 15px/700 count.
- **Tab pill:** the bottom navigation is a floating glass pill, not a docked bar. Inset 14px from the left, right and bottom of the frame (plus the safe-area inset), 30px radius, 7px of internal padding, a 1px translucent-white hairline border, and the floating-glass shadow trio from Elevation. Behind it, `backdrop-filter: blur(22px) saturate(180%)` over a 62%-opaque near-white, declared inside a `@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))` guard; the unguarded base rule carries a 90%-opaque fill so the pill stays legible with no blur support. Four equal-flex tabs, each a 24px-radius lozenge at 50px minimum height, 24px icon over an 11px/700 label in moss ink. The active tab is a translucent green wash (`nav-tab-wash`) with green ink — no filled container, no underline. Inactive tabs use the outlined icon axis (`FILL 0`); the active tab uses filled (`FILL 1`) — the icon itself changes weight, not just colour. Hover tints an inactive tab with a 6% neutral scrim; press sinks it 2px.
- **Screen header (customize/shop):** 68px with a back icon button, an 800/19px title, and the gem pill pushed right.
- **Pill tabs (customize):** transparent pills on a 2px underline; active pill is solid growth green with white text.

### Feedback Sheet
A bottom-anchored panel that rises 100% on a 260ms `cubic-bezier(0.22, 1, 0.36, 1)`, sitting above the tab bar at z-index 60. Correct is #eefce4 with a green top border and green ink; wrong is blush with a red top border and red ink. Each carries an 800/20px Jakarta verdict line with a 26px symbol, the explanation at 15px/21px, and a full-width continue button in the matching colour.

### Honesty Banner
A 2px dashed sage box at 13px/18px with a leading `info` outline symbol, placed directly under the screen title on any surface whose data is placeholder or whose controls do not act — the league standings, the progress chart, the cosmetics catalogue, the shop. The dashed border is what distinguishes it from every other surface in the system, all of which are solid.

### Focus & Motion (system-wide states)
- **Focus ring:** a 3px solid wisdom blue (`--vg-tertiary`, #006590) outline at 2px offset, applied via `:focus-visible` across every chrome and screen surface (`.vg-screen`, `.vg-topbar`, `.vg-header`, `.vg-nav`, `.vg-lesson-top`, `.vg-actionbar`, `.vg-feedback`). Blue is deliberate: it is the one hue that never means "next" or "earned", so a focus ring can never be misread as progress state. Never remove the outline to keep a stone or tile looking clean.
- **Reduced motion:** under `@media (prefers-reduced-motion: reduce)`, decorative loops are switched off entirely (`animation: none` on the encouragement bubble, the floating snake, screen fades and the feedback sheet) and functional feedback is collapsed rather than deleted — press, hover and state transitions drop to a 1ms duration on stones, buttons, tiles, chips and the lesson progress bar. State still changes instantly; nothing animates.

## Do's and Don'ts

### Do:
- **Do** give every pressable object a solid bottom edge in a darker tone of its own fill, and make the press translation equal the edge exactly.
- **Do** reach for `surface-highest` (#e3e2e2) as the default 2px border, the empty-track fill and the locked state — it is the system's structural grey.
- **Do** repaint border, fill and edge together when a tile changes state; a state that only changes the border reads as a rendering bug.
- **Do** set Python in the mono stack everywhere, including inside interactive tiles and chips.
- **Do** draw every icon from Material Symbols Rounded through the shared `Icon` component, switching the `FILL` axis (0 → 1) to mark the active item.
- **Do** mark presentation-only surfaces with the dashed honesty banner rather than dressing static data as live.
- **Do** keep 84px of top and 116px of bottom padding on any screen that carries the fixed chrome.
- **Do** generate any new stop on the path from the shared `pathX`/`pathY` table so the ribbon and the stones stay threaded.
- **Do** put a visible 3px wisdom-blue `:focus-visible` outline on every interactive element you add to a `vg-` surface.
- **Do** give any new decorative loop an `animation: none` entry in the reduced-motion block, and collapse its transitions to 1ms there.
- **Do** guard `backdrop-filter` behind `@supports` and ship a near-opaque fallback fill in the base rule.

### Don't:
- **Don't** use blurred shadows, glows or ambient elevation on anything that scrolls. Soft shadows belong only to the floating plane (the tab pill, the encouragement bubble); the standing exceptions elsewhere are the floating snake in its preview stage and the phone frame itself.
- **Don't** dock, square off or full-bleed the bottom navigation. It floats inset 14px on three sides with the path visible under it; a bar with a top border is the thing this replaced.
- **Don't** fill the active tab with solid green or give it an underline. The active state is an 18% green wash inside a 24px lozenge.
- **Don't** draw the path as a straight bar behind offset stones, and don't hand-place a stone at a coordinate the curve does not share.
- **Don't** use `primary` (#2b6c00), `tertiary` (#006590) or any `-edge` token as a background; they are ink and depth.
- **Don't** put two green "next" affordances on one screen — completed is gold, locked is grey, and only the current step is green.
- **Don't** substitute emoji or a text glyph for an icon on a `vg-` surface.
- **Don't** introduce a third font weight into either family, or an italic.
- **Don't** use a 4px border anywhere except the stat-bar divider, a card's bottom lip or a stone's cut-out ring; and don't introduce a 1px border anywhere but the glass pill.
- **Don't** suppress the `:focus-visible` outline, and don't ship a new animation without a reduced-motion answer for it.
- **Don't** render a lesson list. The path of stones is the navigation model; a vertical list of lesson rows is the thing this system exists to refuse.

## Scope Boundary (deliberate exception)

This system governs the **course surfaces only**: home path, lesson, result, progress, league, profile, customize and shop. In code it is the `vg-` namespace, with tokens declared on `.phone-shell-vg` and every screen wrapped in `.vg-screen`.

The **authentication screen and the four-slide first-run onboarding are explicitly out of scope** and deliberately keep an older, different look built on the non-namespaced classes (`.screen`, `.app-button`, `.auth-screen`, `.mode-tabs`, `.form-stack`, `.option-card`, `.hero-bubble`, `.dots`). That older look has its own softer, blurred-shadow elevation, its own type treatment, and its own emoji-based hero illustration. It is not drift and it is not a backlog item. Do not unify, port or "fix" those screens toward this system unless the user asks for it directly.

Two utilities are shared across the boundary by design: the phone frame itself (`.phone-shell`, `.python-app`) and the entry animations (`.fade-screen`, `.shake`, `.confetti`) defined in the older block.
