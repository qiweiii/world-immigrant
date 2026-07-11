# Design System

## Iconography

Brand and service marks come from [Simple Icons](https://simpleicons.org/). Load them via the CDN at `https://cdn.simpleicons.org/{slug}/{color}` or use the SVG source directly. Generic interface icons use small inline SVGs with `currentColor` and the same stroke conventions.

Rules:

- Use Simple Icons for social platforms, payment providers, and official service marks when available.
- Use inline SVGs for generic actions such as filter, compare, verify, navigation, and theme controls.
- Keep interface icons consistent at a `2px` stroke with round caps and joins.
- Keep icons decorative when adjacent text already provides the label (`aria-hidden="true"`).

## Motion

Local CSS primitives provide the site layout and component patterns. Use [transitions.dev](https://transitions.dev/) as the reference for custom transitions.

Patterns:

- Enter/exit fades: use opacity + translate transitions with `cubic-bezier(0.16, 1, 0.3, 1)`.
- Staggered lists: delay each item by ~40 ms.
- Micro-interactions: keep durations between 150 ms and 250 ms.
- Prefer `transform` and `opacity` for GPU-friendly motion.
- Respect `prefers-reduced-motion`.

## Taste and themes

Use [Taste Skill](https://www.tasteskill.dev/) to develop the visual direction, color relationships, and typography choices before writing CSS.

Process:

1. Collect references that match the desired mood on Taste Skill.
2. Extract a small palette (background, foreground, muted, accent, border).
3. Test combinations against the dark and light versions of the UI.
4. Document the final tokens in `src/styles/global.css` as CSS custom properties.
5. Avoid adding new colors ad-hoc; map every UI surface to a token.

## External design references

External design systems and component libraries may be studied for interaction patterns, accessibility behavior, spacing, and visual hierarchy. They are learning references, not dependencies or templates to copy. Translate useful ideas into the project's own Astro components and local CSS, and preserve the current frameworkless architecture unless an explicit architecture decision changes it.

## Current tokens

The live tokens live in `src/styles/global.css` and support light and dark modes via `[data-theme="dark"]`.

Key colors:

- Light background: `#fafafa`
- Light foreground: `#111113`
- Dark background: `#0e0f14`
- Dark foreground: `#f7f7fb`
- Accent: `#2563eb` (light), `#8fb8ff` (dark)

Typography: Outfit for UI, JetBrains Mono for code and metadata.

## Country brand colors

Each country record carries a decorative brand accent in `brand.color` (hex) and `brand.source` (`flag` | `official_site` | `hybrid`). See `docs/architecture/data-model.md`.

UI usage:

- Set `--country-color` on the country card, hero, or list row from canonical data.
- Render a small `.country-swatch` or a thin bar using that variable.
- Keep brand color decorative (markers, top borders, side accents). Do not use it for primary body text or as the sole focus indicator.
- Site chrome (nav, primary buttons, links) continues to use the global accent tokens above, not country colors.

Current seed values:

| Country | Color | Source |
| --- | --- | --- |
| Canada | `#D52B1E` | Flag (maple-leaf red) |
| Australia | `#012169` | Flag (national flag blue) |
