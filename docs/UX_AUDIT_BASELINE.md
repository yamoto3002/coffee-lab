# Coffee Lab technical UX audit — baseline

Date: 2026-07-13  
Target: `src/app`, `src/components`, production preview at 1440×900 and 390×844

## Audit Health Score

| Dimension | Score | Key finding |
|---|---:|---|
| Accessibility | 2/4 | Labels and focus support are partial; several compact controls and state colors need stronger semantics. |
| Performance | 2/4 | Repeated backdrop filters, wide shadows, gradients, and route-level client rendering add avoidable cost. |
| Responsive Design | 3/4 | No horizontal overflow at sampled viewports; mobile Live Roast density and fixed navigation overlap need refinement. |
| Theming | 1/4 | Tokens exist, but 238 hard-coded color expressions and route-local accents prevent consistent theming. |
| Anti-Patterns | 1/4 | Detector-confirmed gradient text, side stripe, bounce easing, glass effects, decorative grid, and gray-on-color. |
| **Total** | **9/20** | **Poor — major systemic cleanup required** |

## Executive Summary

- P0: 0
- P1: 5 systemic issues
- P2: 4 follow-up issues
- P3 findings intentionally omitted from the implementation backlog
- The strongest foundation is data integrity: local-first persistence, retry queues, date-only normalization, and separate elapsed roast milestones.

## P1 findings

1. **Inconsistent theme vocabulary** — `src/app/globals.css` and route-local utilities. Replace hard-coded accent families with semantic tokens.
2. **WCAG-risk muted text and small labels** — route metadata, status labels, mobile navigation. Raise contrast and minimum readable size.
3. **Missing canonical form behavior** — beans, roasts, tasting, settings. Standardize visible labels, help, required/error semantics, focus, disabled, and loading states.
4. **Expensive decorative effects** — global background, glass cards, coach cards, mobile navigation. Remove decorative grid, constant blur, wide shadows, gradient text, and bounce easing.
5. **Mobile task competition** — Live Roast and tasting input. Keep timer/current milestone/primary action in a reachable structure and prevent fixed navigation from covering controls.

## P2 findings

1. Replace image `alt="tasting"` with meaningful user-provided context or an explicitly decorative empty alt when appropriate.
2. Avoid global custom scrollbar styling; use platform-native scrolling.
3. Add programmatic selected state to segmented controls and filters.
4. Verify dialogs consistently trap focus, close on Escape, restore focus, and prevent background interaction.

## Positive findings

- `lang="ja"`, viewport metadata, manifest, and safe-area padding are present.
- Lint and production build pass at baseline.
- No horizontal document overflow occurred on the sampled key routes.
- Sync failures preserve local input and expose retry behavior.
- `First Crack`, `Second Crack`, `Drop`, development time, and date-only fields are modeled independently.

## Implementation order

1. Quieter + distill the global visual vocabulary.
2. Typeset + clarify navigation, state, and terminology.
3. Layout + adapt home and Live Roast around task priority.
4. Harden forms, dialogs, and async states.
5. Polish with repeated keyboard, responsive, console, lint, and build checks.
