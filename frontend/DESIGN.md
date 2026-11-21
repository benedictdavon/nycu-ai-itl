---
name: LabKnow
description: Find a labmate's experiment details, see who wrote them, and see what was never recorded.
colors:
  coomassie-blue: "#2C3A9C"
  coomassie-deep: "#1E2870"
  coomassie-wash: "#E6E9F7"
  coomassie-ink: "#26306E"
  label-tape: "#F6D365"
  tape-wash: "#FCF1CC"
  tape-ink: "#3D2F00"
  tape-text: "#4A3800"
  tape-edge: "#8A6A00"
  alert-red: "#B42318"
  alert-ink: "#8F1C13"
  alert-wash: "#FDECEA"
  alert-edge: "#E8A39C"
  bench-ink: "#18202B"
  ink-secondary: "#3A4452"
  ink-muted: "#556070"
  field-edge: "#8592A0"
  rule: "#D3D9DD"
  hairline: "#E3E7EA"
  bench-grey: "#F1F3F2"
  paper: "#FFFFFF"
  paper-sunk: "#F7F8F8"
  sage-chip: "#EAEEEC"
  selection: "#C9D1F2"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  body-small:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  tape: "4px"
  md: "10px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.coomassie-blue}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 22px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.coomassie-deep}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.bench-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.coomassie-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.bench-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "46px"
  nav-item-active:
    backgroundColor: "{colors.coomassie-wash}"
    textColor: "{colors.coomassie-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "44px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.bench-ink}"
    rounded: "{rounded.lg}"
    padding: "28px 32px"
  chip-tag:
    backgroundColor: "{colors.sage-chip}"
    textColor: "{colors.bench-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
    height: "36px"
  tape-label:
    backgroundColor: "{colors.label-tape}"
    textColor: "{colors.tape-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.tape}"
    padding: "0 10px"
    height: "28px"
  gap-panel:
    backgroundColor: "{colors.tape-wash}"
    textColor: "{colors.tape-text}"
    rounded: "{rounded.lg}"
    padding: "20px"
  source-marker:
    backgroundColor: "{colors.coomassie-wash}"
    textColor: "{colors.coomassie-blue}"
    rounded: "{rounded.pill}"
    padding: "0 6px"
    size: "26px"
  number-flag:
    backgroundColor: "{colors.alert-wash}"
    textColor: "{colors.alert-ink}"
    rounded: "{rounded.tape}"
    padding: "1px 4px"
---

# Design System: LabKnow

## Overview

**Creative North Star: "The Bench Notebook"**

LabKnow should feel like a well-kept bench notebook passed between labmates. It is plain, sturdy and legible, and every fact sits beside the name of the person who wrote it. It is a working tool, used at a desk between experiments, so it is calm and unhurried: a light bench-grey ground, white pages, and generous space around the things people must read carefully, such as volumes, amounts and temperatures.

Two colours carry meaning and nothing else does. **Coomassie Blue** marks what a labmate has confirmed: cited facts, sources, the primary action. **Label Tape** marks what is missing: gaps, things not recorded, drafts that need a look. A reader should be able to tell documented from undocumented at a glance, before reading a word. Red appears only when something is wrong or unverified.

Components are soft and friendly. Corners are round, cards lift slightly off the page with gentle shadows, and controls are large enough to hit without aiming. The friendliness comes from shape and spacing, not from decoration. There are no gradients, illustrations or emoji.

**Key Characteristics:**
- Two meaningful accents (Coomassie Blue, Label Tape) on a neutral bench-grey and paper base.
- Every number in an answer is either linked to its source or flagged.
- Highly legible type for parameters (Atkinson Hyperlegible Next), with a characterful grotesque (Bricolage Grotesque) for headings.
- Rounded, softly lifted surfaces; touch targets of at least 44px.
- Desktop first; every screen still works at 390px.

## Colors

A neutral bench-and-paper base with two signal colours, each with a single job.

### Primary
- **Coomassie Blue** (`coomassie-blue`): confirmed and cited. Primary buttons, source markers, the "Confirmed by" line, links, focus rings, the active nav item's text.
- **Coomassie Deep** (`coomassie-deep`): hover and pressed state of Coomassie Blue; link hover.
- **Coomassie Wash** (`coomassie-wash`): background for source markers, the active nav item, the suggested-person card and the "Before you confirm" panel. It also highlights the parts of an original record that a draft uses.
- **Coomassie Ink** (`coomassie-ink`): body text on Coomassie Wash.

### Secondary
- **Label Tape** (`label-tape`): not recorded or missing. Tape labels ("Not recorded", "2 gaps", "No close match") and the To review count badge.
- **Tape Wash** (`tape-wash`): background of gap panels, "What the records don't say" boxes and the "not enough in the records" banner.
- **Tape Ink / Tape Text** (`tape-ink`, `tape-text`): text on Label Tape and Tape Wash.
- **Tape Edge** (`tape-edge`): borders of inputs inside a gap panel, and the "when the records are not enough" path on the flow map.

### Tertiary
- **Alert Red** (`alert-red`): borders of error cards, and the wavy underline under an unverified number.
- **Alert Ink** (`alert-ink`), **Alert Wash** (`alert-wash`), **Alert Edge** (`alert-edge`): error titles, the background and border of the "this number isn't in your record" check, and the "Discard draft" text button.

### Neutral
- **Bench Ink** (`bench-ink`): primary text.
- **Ink Secondary** (`ink-secondary`): lead paragraphs and supporting text.
- **Ink Muted** (`ink-muted`): hints, timestamps, helper text. Never used for anything a user must read to act.
- **Field Edge** (`field-edge`): input and secondary-button borders (at least 3:1 on paper).
- **Rule** (`rule`) and **Hairline** (`hairline`): header border and card dividers; row dividers inside cards.
- **Bench Grey** (`bench-grey`): the page background.
- **Paper** (`paper`): cards, inputs, the header.
- **Paper Sunk** (`paper-sunk`): action bars at the foot of a card, read-only fields, and the copyable message box.
- **Sage Chip** (`sage-chip`): project tags and neutral chips.
- **Selection** (`selection`): text selection.

### Named Rules
**The Two Meanings Rule.** Coomassie Blue only ever means "confirmed, cited or the main action". Label Tape only ever means "missing or not recorded". Neither is used for decoration, illustration or emphasis.

**The Red Is Risk Rule.** Alert Red appears only for errors and for numbers nobody has verified. A screen with no problem shows no red.

## Typography

**Display Font:** Bricolage Grotesque (with system-ui, sans-serif)
**Body Font:** Atkinson Hyperlegible Next (with system-ui, sans-serif)

**Character:** Atkinson Hyperlegible Next was designed so that look-alike characters (0/O, 1/l/I) stay distinct, which matters when someone reads "50 ng" or "1 mL" off the screen at the bench. Bricolage Grotesque gives headings a warm, slightly hand-made character, so the app doesn't read as a generic dashboard.

### Hierarchy
- **Display** (700, 36px, 1.15): one per screen, the screen's question or task ("What do you need to know?", "Check the draft").
- **Headline** (600, 22px, 1.3): card and section headings ("Answer", "Changes from the SOP", "Want to ask a person?"). Use 20px for headings inside a form.
- **Title** (700, 19px, 1.4): record names, error titles, the suggested person's name.
- **Body** (400, 17px, 1.55): all reading text. Keep answers and explanations to 66ch or less.
- **Body small** (400, 15px, 1.5): helper text, metadata, captions.
- **Label** (600, 15px, 1.4): form labels, buttons, chips, nav items. Always sentence case.

### Named Rules
**The Legible Numbers Rule.** Every experimental parameter is set in Atkinson Hyperlegible Next, never in the heading face. Counters and timers ("12 seconds so far") use tabular numerals (`font-variant-numeric: tabular-nums`).

**The Sentence Case Rule.** No all-caps labels and no eyebrow text above headings. A heading says what the section is.

## Layout

- **Container:** max-width 1160px, centred, 24px side padding (16px on phones).
- **Two-column pattern:** main content plus a side column (the original record, sources, "what happens next"). Main is `flex: 999 1 560px`, side is `flex: 1 1 320px`, with a 32px gap. They stack automatically below about 912px, side column last.
- **Reading width:** answers, leads and explanations stay at or below 66ch even inside wide cards.
- **Rhythm:** groups of related items are 8 to 12px apart, fields 20 to 24px apart, and sections 28 to 40px apart. There is always more space above a heading than below it.
- **Header:** the wordmark, then the nav (Ask, Add a record, To review with a count), then the current person at the far end. On phones, the nav becomes a row of three equal tabs under the wordmark.
- **Density:** comfortable. Answers and drafts are read slowly, so nothing is compressed to fit.

## Elevation & Depth

Soft and lifted. Surfaces sit on the bench-grey page as white cards with a hairline border and a gentle, offset shadow. Interactive cards (inbox rows, people, list items that open something) lift a little more on hover. Depth always comes from a real offset and blur, never from a coloured glow.

### Shadow Vocabulary
- **Rest** (`0 1px 2px rgba(24,32,43,0.06), 0 4px 14px rgba(24,32,43,0.05)`): every card and panel at rest.
- **Lift** (`0 2px 4px rgba(24,32,43,0.08), 0 10px 24px rgba(24,32,43,0.08)`): hover and focus on clickable cards and rows.
- **Float** (`0 8px 24px rgba(24,32,43,0.18)`): toasts only.

### Named Rules
**The Soft, Not Fuzzy Rule.** Shadows are offset and soft, use bench-ink at low opacity, and never glow, tint or stack. Panels inside a card (gap panel, number check, "Before you confirm") are tinted and flat, with no shadow of their own.

## Shapes

Friendly rounded corners at three sizes:
- **Controls** (10px): buttons, inputs, nav items.
- **Cards** (16px).
- **Chips** (pill): chips, avatars and source markers.

Tape labels are the one deliberate exception: almost square (4px), like a strip of label tape. Avatars are circles with initials. Borders are 1px; the only 2px borders are error cards, selected radio buttons and focus rings (3px Coomassie Blue, 2px offset). No element has a coloured bar down one side.

## Components

### Buttons
- **Shape:** gently rounded (10px), at least 48px tall (44px for text buttons).
- **Primary:** Coomassie Blue fill, white label, 0 22px padding. Exactly one per view or panel. The label names the result ("Draft the record", "Confirm and publish", "Copy message"), never "Submit".
- **Hover / Focus:** hover deepens to Coomassie Deep over 160ms. Focus shows a 3px Coomassie Blue ring with a 2px offset. Disabled uses a Rule fill with Ink Secondary text, and always carries a nearby reason ("Tick the box above first").
- **Secondary:** paper fill, 1px Field Edge border, Bench Ink label.
- **Text button:** no fill, Coomassie Blue label. Used for "Edit" on draft rows, "Add one" and similar inline actions. Destructive text buttons ("Discard draft") use Alert Ink.

### Chips
- **Tag:** Sage Chip pill, label type, with an optional 32px remove button that has an `aria-label`.
- **Person:** Coomassie Wash pill. The uploader's own chip has no remove control and reads "(you, always kept)".
- **Add chip:** paper fill with a dashed Field Edge border and a plus icon ("Add someone", "Add a tag").
- **Radio choice:** two pill-shaped buttons in a `role="radiogroup"`. Selected is a Coomassie Blue fill with a white label; unselected is paper with a Coomassie Blue 2px border. Nothing is selected by default.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Paper on Bench Grey.
- **Shadow Strategy:** Rest; clickable cards use Lift on hover (see Elevation & Depth).
- **Border:** 1px Hairline.
- **Internal Padding:** 28px 32px on desktop, 20px on phones. An action bar at the foot of a card uses Paper Sunk with a Rule top border.

### Inputs / Fields
- **Style:** Paper fill, 1px Field Edge border, 10px radius, at least 46px tall. The label always sits above the field. An optional field says "(optional)" in Ink Muted after the label.
- **Focus:** 3px Coomassie Blue ring; Coomassie Blue caret.
- **In a gap panel:** Tape Edge border, with the placeholder "Leave empty if you don't know".
- **Error:** Alert Red border and an Alert Ink message under the field that names the problem and the fix.
- **Hidden file input:** visually hidden inside its drop-zone label (not `opacity: 0`), so the label shows the focus ring.

### Navigation
- Label type, 44px tall, 10px radius. Active item: Coomassie Wash fill with Coomassie Blue text and `aria-current="page"`. Inactive: Bench Ink text; hover adds a Paper Sunk fill.
- The To review item carries a Label Tape count badge (22px pill) for questions and drafts waiting.

### Source marker (signature)
- A 26px Coomassie Wash pill holding the source number in label type. It sits right after the claim it supports and links to the record.
- `aria-label` names the record ("Source 1: Transformation of strain X with plasmid P").
- The same number appears as a filled Coomassie Blue circle on the matching source card.

### Tape label and gap panel (signature)
- **Tape label:** Label Tape, 4px corners, label type ("Not recorded", "2 gaps", "No close match").
- **Gap panel:** Tape Wash, 16px corners, 20px padding. It opens with a tape label and a short heading. It lists what is missing, or holds the inputs to fill it.
- The same treatment marks missing information everywhere: the gaps on Review, "What the records don't say" on Ask, the banner on the "not enough" answer, and "Not recorded" on the record view.

### Number flag (signature)
- A number that has no source (in an answer) or that isn't in the original record (in a draft) gets Alert Wash behind it, Alert Ink text and a wavy Alert Red underline.
- On Review it opens a check panel (Alert Wash, Alert Edge border) with "Yes, it's right" and "Remove it". Answering it turns the summary chip from "1 number not in your record" to "Every number checked".

### Toast
- Bench Ink fill, white title, Float shadow, 10px radius, check icon. `role="status"`. Says what happened and what comes next ("Sent to Alex for review. It stays in Your open questions until Alex confirms it.").

## Do's and Don'ts

### Do:
- **Do** put a source marker after every claim that contains a number, and flag any number without one.
- **Do** name the contributor next to every answer and on every source card.
- **Do** use the gap panel for everything missing, in every screen, so it is learned once.
- **Do** keep one primary button per view, labelled with what it does.
- **Do** give every control a 44px minimum target and a visible 3px focus ring.
- **Do** say how long the model may take ("12 seconds so far. It usually takes under 30.") instead of showing a fake percentage.
- **Do** respect `prefers-reduced-motion`: hover lifts and colour changes only; no movement.

### Don't:
- **Don't** use Coomassie Blue or Label Tape decoratively, including for illustrations, section accents or charts.
- **Don't** add gradients, glass effects, glows, or a coloured bar down one side of a card.
- **Don't** set parameters or numbers in Bricolage Grotesque.
- **Don't** use all-caps labels, eyebrow text above headings, or emoji.
- **Don't** pre-select a person, pre-tick an agreement, or make an irreversible action a single click.
- **Don't** repeat blanket "check the numbers" warnings. Flag the specific number instead.
