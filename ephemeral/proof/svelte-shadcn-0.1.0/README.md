# Svelte and shadcn-svelte release proof

Observed against the release candidate in `/Users/tyler/src/astro-template-svelte-shadcn` on 2026-08-17.

## Observable claims

### The compiled Astro site serves a real Svelte island composed from shadcn-svelte source components

- `vp run build` completed a static production build with one generated route.
- `vp exec astro preview --host 0.0.0.0 --background` started the compiled preview server as PID 47980.
- `GET http://127.0.0.1:4321/` returned HTTP 200 with a 9,407-byte body; the response headers are preserved in `headers.txt`.
- The served HTML contained an `astro-island` with `client="load"`, the compiled `SvelteDemo` module, the Svelte client renderer, and server-rendered shadcn Card, Badge, and Button markup.
- The initial rendered state contained `Svelte clicks: 0` and `Interactive count: 0`.

### The compiled client assets exist and are served by the preview server

The page's exact hashed assets all returned HTTP 200. Their fetched byte counts and SHA-256 digests were:

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `index.html` | 9,407 | `91ecff5b121fec58e36ac24a27fa9db2617225983f4cf1e7c875b41ce498292c` |
| `SvelteDemo.B4wkXbiv.js` | 75,514 | `a9df798a58afbae3a03462e2c9a816717c58e448b93140618e489b564ca4c68d` |
| `client.svelte.B0c_jibu.js` | 889 | `27759faa551f3e02073bd3b66cadb4e738c2e273d88918cfe3822de884991af2` |
| `index.BR2__uyd.css` | 148,899 | `bf5b31e55e8ab02270291af1775c4de4ce954e846a8500776365e762c20f2759` |

The compiled `SvelteDemo` bundle contains the counter's event handler and both reactive count labels.

### The complete installable shadcn-svelte registry corpus compiles together

- The official `shadcn-svelte add --all` result contains 55 component directories under `src/lib/components/ui`.
- `vp run verify` passed Vite+ formatting and linting, rsvelte formatting, rsvelte linting, rsvelte-check through ts-go, and Astro checking with zero errors or warnings.
- `vp run build` passed after the proof component imported generated Badge, Button, Card, CardContent, CardDescription, CardHeader, and CardTitle exports.
- `vp exec pnpm peers check` reported no peer dependency issues.
- `vp outdated --compatible --long` reported no compatible updates.

## Evidence limitation

The Codex browser runtime reported no available browser backends, so automated visual and click-through evidence could not be captured. The compiled server, SSR output, hydration declaration, served Svelte client bundles, and compiled event handler were verified directly; an automated browser click is not claimed.
