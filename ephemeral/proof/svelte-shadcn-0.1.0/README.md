# Svelte and shadcn-svelte release proof

Observed against the release candidate in `/Users/tyler/src/astro-template-svelte-shadcn` on 2026-08-17.

## Observable claims

### The compiled Astro site serves a real Svelte island composed from shadcn-svelte source components

- `vp run build` completed a static production build with one generated route.
- `vp exec astro preview --host 0.0.0.0 --background` started the compiled preview server as PID 56351.
- `GET http://127.0.0.1:4321/` returned HTTP 200 with a 9,407-byte body; the response headers are preserved in `headers.txt`.
- The served HTML contained an `astro-island` with `client="load"`, the compiled `SvelteDemo` module, the Svelte client renderer, and server-rendered shadcn Card, Badge, and Button markup.
- The initial rendered state contained `Svelte clicks: 0` and `Interactive count: 0`.

### The compiled client assets exist and are served by the preview server

The page's exact hashed assets all returned HTTP 200. Their fetched byte counts and SHA-256 digests were:

| Asset                       |   Bytes | SHA-256                                                            |
| --------------------------- | ------: | ------------------------------------------------------------------ |
| `index.html`                |   9,407 | `b0a84f122b20947eeb34735cb1c893d6c80b49d1f1037f8cf3c515f53561f61c` |
| `SvelteDemo.B4wkXbiv.js`    |  75,514 | `a9df798a58afbae3a03462e2c9a816717c58e448b93140618e489b564ca4c68d` |
| `client.svelte.B0c_jibu.js` |     889 | `27759faa551f3e02073bd3b66cadb4e738c2e273d88918cfe3822de884991af2` |
| `index.72SPUhtv.css`        | 148,923 | `459bb20726e2f63eba8e074dc7bd727b443960b0dda0caeda4038bfda9b43210` |

The compiled `SvelteDemo` bundle contains the counter's event handler and both reactive count labels.

### The complete installable shadcn-svelte registry corpus compiles together

- The registry corpus contains 56 component directories under `src/lib/components/ui`: the 55 Vega items installed by `shadcn-svelte add --all` plus the generic registry's installable `data-table` item.
- `vp run verify` passed Vite+ formatting and linting, rsvelte formatting, rsvelte linting, rsvelte-check through ts-go, and Astro checking with zero errors or warnings.
- `vp run check:shadcn` bundled all 56 registry components together through `@rsvelte/vite-plugin-svelte`.
- A temporary `.ts` file containing `const value: string = 123` was rejected by `rsvelte-check --tsgo`, proving the gate covers ordinary TypeScript as well as generated Svelte overlays; the probe was removed before release.
- `vp run build` passed after the proof component imported generated Badge, Button, Card, CardContent, CardDescription, CardHeader, and CardTitle exports.
- `vp exec pnpm peers check` reported no peer dependency issues.
- `vp outdated --compatible --long` reported no compatible updates.

## Browser evidence

The primary Codex browser runtime reported no available browser backends. The independent adversarial reviewer used local headless Chrome 151 against the same compiled preview server and recorded three real clicks changing `Interactive count: 0` to `Interactive count: 3`, applied shadcn styles, and zero console errors in `ephemeral/reviews/202608171805-svelte-shadcn-round-01.md`.
