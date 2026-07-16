---
name: Coffee Lab
description: A calm instrument bench for roast, tasting, and learning records.
colors:
  canvas: "#0C0E0E"
  surface: "#131716"
  surface-raised: "#1A201E"
  border: "#303734"
  ink: "#F2F3EE"
  ink-muted: "#AEB6AE"
  copper: "#D9A066"
  copper-ink: "#1B120A"
  info: "#70C8C3"
  success: "#70C99C"
  warning: "#E1B966"
  danger: "#E17A73"
typography:
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Hiragino Sans, Yu Gothic UI, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Hiragino Sans, Yu Gothic UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Hiragino Sans, Yu Gothic UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 450
    lineHeight: 1.7
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Hiragino Sans, Yu Gothic UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: 1.4
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.copper}"
    textColor: "{colors.copper-ink}"
    rounded: "{rounded.md}"
    padding: "12px 18px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 18px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "44px"
---

# Design System: Coffee Lab

## Overview

**Creative North Star: "焙煎台の計器盤"**

Coffee Lab feels like the instrument bench beside a working roaster: dark enough for a dim room, warm enough to belong beside coffee, and precise enough that elapsed time and state can be trusted at a glance. Information is arranged by task sequence and operational priority. Familiar controls disappear into the work; personality comes from disciplined typography, tactile copper accents, and the cadence of real roast data.

The system explicitly rejects marketing hero composition, generic AI/SaaS card dashboards, neon cyberpunk decoration, purple gradients, decorative grids, glassmorphism, and constant glow. Desktop offers breadth for comparison; mobile preserves the same hierarchy with reachable controls and no horizontal dependence.

**Key Characteristics:**

- Restrained dark tonal layers with one warm action accent.
- Japanese-first labels with tabular numerals for time, weight, and scores.
- Flat-by-default surfaces, 1px structural dividers, and scarce elevation.
- One obvious primary action per task region.
- Explicit state language for local, offline, pending, synced, and failed states.

## Colors

The palette is charcoal and espresso-neutral, with copper reserved for primary action and current selection. Semantic colors identify status but never carry meaning alone.

### Primary

- **Roaster Copper:** Used for the single primary action, selected controls, and the most important current-state marker.

### Secondary

- **Instrument Teal:** Used for informational state, focus support, and analysis references; never as decorative glow.

### Neutral

- **Kiln Canvas:** The page background; never pure black.
- **Bench Surface:** Primary working surface and form background.
- **Raised Instrument:** Menus, selected rows, and controls that must separate from the bench.
- **Chalk Ink:** High-contrast text.
- **Quiet Label:** Secondary text that remains WCAG AA compliant.
- **Structural Border:** Dividers and boundaries, not decorative boxes.

**The Copper Budget Rule.** Copper occupies less than ten percent of a routine product screen. Its rarity creates priority.

**The State Sentence Rule.** Teal, green, amber, and red always appear with an icon and plain-language status or recovery text.

## Typography

**Display Font:** System Japanese sans-serif stack  
**Body Font:** System Japanese sans-serif stack  
**Label/Mono Font:** Native tabular numerals within the same stack; platform monospace only for identifiers and elapsed time

**Character:** A single, highly legible family keeps the product coherent across Japanese labels, Latin coffee terms, and dense numeric data. Hierarchy comes from weight, spacing, and placement—not novelty fonts.

### Hierarchy

- **Headline** (700, 1.75rem, 1.25): One page title per screen; never a landing-page hero.
- **Title** (700, 1.125rem, 1.4): Task regions and meaningful groups.
- **Body** (450, 1rem, 1.7): Instructions and explanations, capped near 70 characters when prose is long.
- **Label** (650, 0.8125rem, 1.4): Controls, metadata, and status. Uppercase is limited to established short roast notation such as DEV, not section scaffolding.

**The Numeric Unit Rule.** A number and its unit read as one object; the number has priority, the unit remains adjacent and quieter.

## Elevation

The system is flat by default. Depth is conveyed through tonal contrast and structural borders. A compact shadow with no more than 8px blur is reserved for sticky controls, menus, and dialogs; bordered working surfaces do not also receive decorative wide shadows.

**The Bench Rule.** If a group can be understood through spacing and a divider, it is not a card. Containers exist only when they protect a distinct task, selection, or state.

## Components

### Buttons

- **Shape:** Firm, gently rounded corners (10px), minimum 44px height.
- **Primary:** Roaster Copper with dark ink; one primary action per region.
- **Hover / Focus:** Small tonal lift and a 2px visible focus outline; active state compresses to 0.98 without bounce.
- **Secondary / Ghost:** Raised Instrument or transparent; full labels accompany icons for important actions.

### Chips

- **Style:** Compact filters only, not decorative tags. Unselected chips use a structural border; selected chips use a quiet copper tint and explicit checked/selected semantics.
- **State:** Minimum 40px on desktop and 44px on touch surfaces.

### Cards / Containers

- **Corner Style:** Maximum 14px.
- **Background:** Bench Surface or Raised Instrument without gradients or backdrop blur.
- **Shadow Strategy:** Flat at rest; elevation only for genuine overlap.
- **Border:** One structural 1px border when separation is required.
- **Internal Padding:** 16px mobile, 20-24px desktop.

### Inputs / Fields

- **Style:** 44px minimum, visible label, solid Bench Surface, 1px Structural Border, 10px radius.
- **Focus:** 2px Instrument Teal outline with offset; no glow.
- **Error / Disabled:** Icon plus sentence; invalid fields keep their entered value and identify the exact correction.

### Navigation

- **Style, typography, default/hover/active states, mobile treatment.** Desktop uses a quiet persistent rail. Mobile uses five evenly distributed destinations with labels and a reachable primary roast action integrated without obscuring content. Active state uses weight, icon, and a restrained copper marker—not glow or a side stripe.

### Roast Timeline

The timeline is a data instrument, not a decorative chart. First Crack, Second Crack, and Drop use consistent elapsed `MM:SS`, remain separately labeled, and align with heat/air changes in one source of truth.

## Do's and Don'ts

### Do:

- **Do** make the next useful action visible in the initial viewport.
- **Do** keep date-only values as `YYYY-MM-DD` and roast milestones as elapsed `MM:SS`.
- **Do** use explicit Japanese state language for local save, pending sync, success, offline, and failure.
- **Do** keep touch targets at least 44 by 44 CSS pixels and preserve safe-area padding.
- **Do** use spacing, grouping, and dividers before introducing a container.
- **Do** preserve a visible focus indicator and reduced-motion alternative for every interaction.

### Don't:

- **Don't** turn the app into a marketing landing page with hero slogans, decorative metrics, or conversion-first hierarchy.
- **Don't** build a generic AI/SaaS dashboard from repeated icon cards.
- **Don't** use neon cyberpunk styling, purple gradients, decorative grids, glassmorphism, backdrop blur, constant glow, or gradient text.
- **Don't** use a colored side stripe thicker than 1px on cards, rows, alerts, or active navigation.
- **Don't** pair a 1px card border with a decorative shadow blur of 16px or more.
- **Don't** use bounce or elastic easing, over-rounded containers, or uppercase tracked eyebrows as universal scaffolding.
- **Don't** imitate Apple or Google surfaces without Coffee Lab's operational logic.
- **Don't** assume every user understands roast science terminology; explain DEV and similar abbreviations where decisions occur.
