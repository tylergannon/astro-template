# Svelte and shadcn-svelte release proof

Observed against the release candidate in `/Users/tyler/src/astro-template-svelte-shadcn` on 2026-08-17.

## Observable claims

### The compiled Astro site serves a real Svelte island composed from shadcn-svelte source components

- `vp run build` completed a static production build with one generated route.
- `vp exec astro preview --host 0.0.0.0 --background` started the compiled preview server as PID 94634.
- `GET http://127.0.0.1:4321/` returned HTTP 200 with a 9,598-byte body; the response headers are preserved in `headers.txt`.
- The served HTML contained an `astro-island` with `client="load"`, the compiled `SvelteDemo` module, the Svelte client renderer, and server-rendered shadcn Card, Badge, Button, and Sonner output.
- The initial rendered state contained `Svelte clicks: 0` and `Interactive count: 0`.

### The compiled client assets exist and are served by the preview server

The page's exact hashed assets all returned HTTP 200. Their fetched byte counts and SHA-256 digests were:

| Asset                       |   Bytes | SHA-256                                                            |
| --------------------------- | ------: | ------------------------------------------------------------------ |
| `index.html`                |   9,598 | `a70d573ac62c03dcdb28e9ca94f92166044502fa540f15f1e0aa824d63bd2dd7` |
| `SvelteDemo.Cz2JDoyx.js`    | 112,748 | `15dae471a651794b2e65ce75896c76894d8d667552afcbcb7d13273f325301c6` |
| `client.svelte.DeFOWygR.js` |     889 | `a7cef768cb44f602da34fb160f4d799d01c848d3d135211876d21b5101e1905c` |
| `index.ClR2JS8S.css`        | 162,912 | `59118bb9c09d38efed5b787a5009b77c8b7fce1eac1765979da574cf06d4e800` |

The compiled `SvelteDemo` bundle contains the counter's event handler and both reactive count labels.

### The complete installable shadcn-svelte registry corpus compiles together

- The registry corpus contains 56 component directories under `src/lib/components/ui`: the 55 Vega items installed by `shadcn-svelte add --all` plus the generic registry's installable `data-table` item.
- Tailwind content detection is scoped to `src/`, so tracked worklogs, proofs, and reviews cannot change production CSS.
- `vp run verify` passed Vite+ formatting and linting, rsvelte formatting, rsvelte linting, rsvelte-check through ts-go, full registry client/SSR bundling, Astro checking, the production build, and a compiled-preview HTTP smoke test.
- `vp run check:shadcn` bundled all 56 registry components for client and SSR through `@rsvelte/vite-plugin-svelte` with the project's Svelte configuration.
- The SSR pass bundles registry dependencies instead of externalizing them; the narrow `mode-watcher` source patch therefore fails this gate if Sonner's dependency graph regresses under rsvelte.
- A temporary `.ts` file containing `const value: string = 123` was rejected by `rsvelte-check --tsgo`, proving the gate covers ordinary TypeScript as well as generated Svelte overlays; the probe was removed before release.
- `vp run build` passed after the proof component imported generated Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, and Sonner exports.
- `vp exec pnpm peers check` reported no peer dependency issues.
- `vp outdated --compatible --long` reported no compatible updates.

## Browser evidence

The primary Codex browser runtime reported no available browser backends. The independent adversarial reviewer used local headless Chrome 151 against the exact compiled assets listed above and recorded three real clicks changing `Interactive count: 0` to `Interactive count: 3`, applied shadcn styles, and zero console errors in `ephemeral/reviews/202608171815-svelte-shadcn-round-02.md`.

To repeat the interaction proof: run `vp run verify`, start `vp exec astro preview --host 0.0.0.0 --background`, open `http://127.0.0.1:4321/`, click the `Svelte clicks` button three times, confirm both counters read `3` with no console errors, and stop the server with `vp exec astro preview stop`.
