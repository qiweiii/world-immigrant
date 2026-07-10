# Documentation

This folder is the product and engineering source of truth for World Immigrant.

## How the docs site works

`docs.html` at the repository root is the light-only docs browser.

It does **not** auto-discover files. Every document must be registered in the
`docs` array inside `docs.html` with:

- `path` relative to `docs/`
- `title` for the sidebar
- `type` of `markdown` or `mermaid`
- `order` for sidebar sorting within and across folders

If you add, rename, move, or delete a file under `docs/`, update `docs.html` in
the same change. Also update this README if the folder conventions change.

## Folder map

- `product/` — product brief, strategy, design system
- `architecture/` — system architecture, data model, technical approach, viability review
- `implementation/` — implementation plan, Hermes automation, UX field notes
- `research/` — competitor and source research
- `diagrams/` — Mermaid diagrams and diagram notes

## Recommended reading order

1. Product brief and strategy
2. Architecture and data model
3. Implementation plan and Hermes automation
4. Diagrams and research notes

## Local preview

Serve the repository root and open `/docs.html`:

```bash
python3 -m http.server 8090 --bind 0.0.0.0 --directory .
```

Then open `http://localhost:8090/docs.html`.

## Writing rules

- English only
- Finalized language only; no draft or early-stage hedging
- Prefer editing existing sections over creating redundant pages
- Keep filenames clean with no numeric prefixes
