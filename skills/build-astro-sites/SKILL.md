---
name: build-astro-sites
description: Build, modify, and verify Astro 7 pages, layouts, components, content, styles, images, and integrations in this Vite+ template. Use for any task touching .astro files, Astro configuration, routing, Tailwind styling, astro:assets, astro-icon, or the Astro development and build workflow.
---

# Build Astro Sites

## Start with current documentation

Consult the configured Astro Docs MCP for version-sensitive APIs. This template targets Astro 7 and Vite 8 behavior; do not apply older integration or Tailwind setup from memory.

## Preserve the architecture

- Prefer Astro components and zero client JavaScript. Add a UI framework only when the feature requires client-side interactivity that a small native script cannot express cleanly.
- Put reusable page shells in `src/layouts/`, UI pieces in `src/components/`, routes in `src/pages/`, and optimizable images in `src/assets/`.
- Keep global design tokens and base styles in `src/styles/global.css`. Use Tailwind utilities for component-level styling.
- Use `astro-icon` with installed Iconify collections. Add only the icon collection needed; do not fetch icons at runtime.

## Handle images intentionally

- Import local raster images from `src/assets/` and render with `Image` or `Picture` from `astro:assets`.
- Supply meaningful `alt` text, or `alt=""` for decorative images.
- Rely on the global `constrained` layout for ordinary content. Use `full-width` for heroes and `fixed` for logos or avatars.
- Set `priority` only for likely largest-contentful-paint images. Keep below-the-fold images lazy.
- Allowlist remote image domains in `astro.config.mjs` before optimizing remote sources.

## Use the Vite+ workflow

```sh
vp install
vp exec astro dev --host 0.0.0.0 --background
vp run verify
```

Use `vp run`, not `vp dev` or `vp build`, for Astro lifecycle commands: Astro wraps Vite and must remain the framework entrypoint. Use `vp add` and `vp remove` for dependency changes.
Bind background development servers to `0.0.0.0` so sandboxed browser tools can reach them at `http://127.0.0.1:4321/`.

Svelte source is compiled, formatted, linted, and checked with rsvelte. Run `vp run format:rsvelte`, `vp run lint:rsvelte`, and `vp run check:rsvelte`; the checker uses ts-go. The official `svelte` package remains required because rsvelte replaces the compiler/tooling layer, not Svelte's runtime modules.
After adding or updating shadcn-svelte registry items, run `vp run check:shadcn` to bundle the complete installed corpus through rsvelte.

## Verify changes

Run `vp run verify`; it owns the complete format, lint, ts-go, client/SSR registry, Astro, production-build, and compiled-preview gate. For visible work, also open the running site and check the changed route at narrow and wide viewports, keyboard focus, console errors, and image layout shift.
