# Svelte and shadcn-svelte release proof

Observed against the release candidate in `/Users/tyler/src/astro-template-svelte-shadcn` on 2026-08-17.

## Observable claims

### The compiled Astro site serves a real Svelte island composed from shadcn-svelte source components

- `vp run build` completed a static production build with one generated route.
- `vp exec astro preview --host 0.0.0.0 --background` started the compiled preview server as PID 12742.
- `GET http://127.0.0.1:4321/` returned HTTP 200 with a 9,416-byte body; the response headers are preserved in `headers.txt`.
- The served HTML contained an `astro-island` with `client="load"`, the compiled `SvelteDemo` module, the Svelte client renderer, and server-rendered shadcn Card, Badge, and Button markup.
- The initial rendered state contained `Svelte clicks: 0` and `Interactive count: 0`.

### The compiled client assets exist and are served by the preview server

The page's exact hashed assets all returned HTTP 200. Their fetched byte counts and SHA-256 digests were:

| Asset                       |   Bytes | SHA-256                                                            |
| --------------------------- | ------: | ------------------------------------------------------------------ |
| `index.html`                |   9,416 | `27ba0ac5e5ee0174c62ef6c77a059f0073ae82c8f9529e842eca67a5b2a8f240` |
| `SvelteDemo.B4wkXbiv.js`    |  75,514 | `a9df798a58afbae3a03462e2c9a816717c58e448b93140618e489b564ca4c68d` |
| `client.svelte.B0c_jibu.js` |     889 | `27759faa551f3e02073bd3b66cadb4e738c2e273d88918cfe3822de884991af2` |
| `index.Ba1z4j3d.css`        | 147,769 | `6456fb3d77c0e8dfc739a3e47240266204dd6eabc025ce2c92cfc6aeb12088e5` |

The compiled `SvelteDemo` bundle contains the counter's event handler and both reactive count labels.

### The complete installable shadcn-svelte registry corpus compiles together

- The registry corpus contains 56 component directories under `src/lib/components/ui`: the 55 Vega items installed by `shadcn-svelte add --all` plus the generic registry's installable `data-table` item.
- Tailwind content detection is scoped to `src/`, so tracked worklogs, proofs, and reviews cannot change production CSS.
- `vp run verify` passed Vite+ formatting and linting, rsvelte formatting, rsvelte linting, rsvelte-check through ts-go, full registry client/SSR bundling, Astro checking, the production build, and a compiled-preview HTTP smoke test.
- `vp run check:shadcn` bundled all 56 registry components for client and SSR through `@rsvelte/vite-plugin-svelte` with the project's Svelte configuration.
- The SSR pass bundles registry dependencies instead of externalizing them, including the dark-only Sonner wrapper. Focused bug-shape, one-line, and no-rune probes distinguish the known rsvelte compiler limitation; an upstream fix prints a non-blocking removal notice.
- A temporary `.ts` file containing `const value: string = 123` was rejected by `rsvelte-check --tsgo`, proving the gate covers ordinary TypeScript as well as generated Svelte overlays; the probe was removed before release.
- `vp run build` passed after the proof component imported generated Badge, Button, Card, CardContent, CardDescription, CardHeader, and CardTitle exports.
- `vp exec pnpm peers check` reported no peer dependency issues.
- `vp outdated --compatible --long` reported no compatible updates.

## Browser evidence

The primary Codex browser runtime reported no available browser backends. The independent adversarial reviewer used local headless Chrome 151 against the exact compiled assets listed above and recorded three real clicks changing `Interactive count: 0` to `Interactive count: 3`, applied shadcn styles, and zero console errors in the final adversarial review artifact.

To repeat the interaction proof: run `vp run verify`, start `vp exec astro preview --host 0.0.0.0 --background`, open `http://127.0.0.1:4321/`, click the `Svelte clicks` button three times, confirm both counters read `3` with no console errors, and stop the server with `vp exec astro preview stop`.
