# Adversarial review — Svelte + shadcn-svelte release candidate (round 10)

## Review target

- Branch `codex/svelte-shadcn`, clean working tree at `fee7f3a` ("fix: explain rsvelte probe failures"); no tags, not merged into `main`, `package.json` version `0.1.0`.
- Whole body of work re-reviewed end to end (`a250b8a` → … → `1762666` → `fee7f3a`). This round I additionally audited the part of the template no earlier round had examined closely: the theme layer (`src/layouts/Layout.astro`, `src/styles/global.css`, `src/pages/index.astro`) and its relationship to shadcn's token system and `mode-watcher`.
- Proof: `ephemeral/proof/svelte-shadcn-0.1.0/`; worklog `ephemeral/worklog/202608171728-svelte-shadcn-rsvelte.md`.

Authoritative requirements: `AGENTS.md`/`CLAUDE.md` (symlinked), `skills/build-astro-sites/SKILL.md`, and the user's goals — install Svelte plus every installable shadcn-svelte component, update compatible dependencies, use rsvelte tooling everywhere it applies, use ts-go wherever possible, and merge/version only if the application actually works through a compiled Astro preview server with a Svelte island and shadcn components. The caller imposed no narrowing of subject matter, so nothing was ignored.

## Evidence inspected and independently reproduced

Read: the `fee7f3a` diff, the whole of `scripts/verify-shadcn-registry.ts` and `scripts/verify-preview.ts`, `src/layouts/Layout.astro`, `src/pages/index.astro`, `src/styles/global.css`, `src/components/SvelteDemo.svelte`, `src/lib/components/ui/sonner/sonner.svelte`, `package.json`, `vite.config.ts`, `tsconfig.json`, `astro.config.mjs`, `svelte.config.js`, both rsvelte lint configs, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, the patch, `.gitignore`, `.github/workflows/ci.yml`, README, `AGENTS.md`, the skill, proof, worklog.

Executed:

| Check | Result |
| --- | --- |
| `vp run verify` (9 stages) | **exit 0**; `vp check` 408 files, rsvelte lint 1 + 338 files, `rsvelte-check --tsgo` 336 files 0/0, `check:shadcn` "Confirmed the documented rsvelte limitation. Bundled all 56 …", `astro check` 0 errors, preview smoke test green |
| Proof asset table at HEAD | **all four entries still reproduce**: 9,407 `7f0f96d4…`, 75,514 `a9df798a…`, 889 `27759faa…`, 148,806 `41c14065…` |
| **Round-09 finding 1 closed** | I re-broke the one-line control in a scratch checkout: the gate now fails with `Error: The rsvelte one-line control probe failed; the documented class-field workaround no longer compiles.` and the rolldown error preserved as `[cause]` — the guarantee is named, the cause retained |
| Theme audit via CDP against the compiled preview | as shipped: `html.class=dark`, body `oklch(0.145 0 0)`, card `oklch(0.205 0 0)`, fg `oklch(0.985 0 0)` — correct. With `dark` removed at runtime: tokens flip to light (body `oklch(1 0 0)`, fg `oklch(0.145 0 0)`) but `color-scheme` stays **dark**, the hero paragraph stays `oklch(0.869 0.022 252.894)` (`text-slate-300`) on white (~1.2:1), the eyebrow stays `oklch(0.811 …)` violet on white, and the violet radial-gradient tuned for `#080b14` remains (finding 1) |
| Compiled CSS cascade | layered `:root` (light palette + `color-scheme: dark`) at byte offset 7,971 inside `@layer base`; unlayered `.dark{…}` at 143,990 — the `.dark` block wins unconditionally, so the `:root` shadcn palette is unreachable while `Layout.astro:16` hardcodes the class |
| `vp outdated --compatible --long` / `vp exec pnpm peers check` | no compatible updates; no peer issues |
| Probe-workspace safety (`.astro/shadcn-*`) | re-confirmed benign: `rsvelte-fmt --check .`, `rsvelte-check`, `astro check`, `astro build` all ignore `.astro/` |

Gate, artifacts, hydration, and the compiler-limitation machinery are all in good order; the two most recent commits closed the round-08 and round-09 findings cleanly. The lead finding below is in the shipped template itself.

## Findings

### 1. Issue — the template only renders correctly in forced dark mode, while shipping shadcn's full token system and `mode-watcher`

`src/layouts/Layout.astro:16` hardcodes `<html lang="en" class="dark">`, and the stylesheet is built around that assumption in three incompatible ways:

- `src/styles/global.css:53-55` puts `color-scheme: dark` and a raw `background: #080b14` on `:root`, then assigns shadcn's **light** palette to the same selector (`--background: oklch(1 0 0)`, `--foreground: oklch(0.145 0 0)`). The `.dark` block at `:111` is emitted *outside* `@layer base` (compiled offset 143,990 vs the layered `:root` at 7,971), so it always wins: the light palette is dead code in this template.
- `src/styles/global.css:89-98` sets `background: radial-gradient(…, #080b14)` and `color: #f8fafc` on `body` and then `@apply bg-background text-foreground` in the same rule, so raw dark-only hex values and tokens are layered on top of each other.
- `src/pages/index.astro:10,16` styles the hero with fixed `text-violet-300` and `text-slate-300` rather than tokens.

Measured consequence (CDP against the compiled preview, removing only the `dark` class — the exact change a consumer makes to enable light or system mode): tokens flip correctly, but `color-scheme` remains `dark` so UA controls and scrollbars stay dark on a white page, the hero paragraph renders `oklch(0.869 …)` on `oklch(1 0 0)` (≈1.2:1, effectively invisible), the eyebrow violet fails likewise, and the dark-tuned violet gradient sits over white.

Compounding it, the installed `sonner` component reads the theme from `mode-watcher` (`src/lib/components/ui/sonner/sonner.svelte:2,17` — `import { mode } from "mode-watcher"`, `theme={mode.current}`) while **no `ModeWatcher` component is mounted anywhere** in `src/`, so the registry's own theming contract is half-wired: the dependency that exists solely to switch `.dark` is present (and patched, per README:64) but never installed into the app. Either commit to dark-only — delete the unreachable `:root` palette, tokenize the hero colors, and say so in the README — or wire `ModeWatcher` and make light mode actually render. As it stands the first consumer who follows shadcn-svelte's standard dark-mode setup gets an unreadable page.

### 2. Issue (low) — the registry gate still only compiles; 49 of the 56 components are never rendered

`check:shadcn` bundles all 56 for client and SSR, and the demo prerenders seven. A component that compiles but throws during SSR — missing context provider, namespace-vs-default export mistake — passes `verify`, which is the first failure a consumer meets when they drop a new component onto a page. Generating a fixture page and prerendering it inside the gate would cover all 56 without touching the shipped demo (42 rendered by hand in round 06; the repository still has no equivalent).

### 3. Nitpick — the expiry notice still has no guaranteed reader

`scripts/verify-shadcn-registry.ts:84-88` emits `NOTICE: rsvelte now accepts multiline class-field initializers; …` non-blockingly (correct after round 09), but `.github/workflows/ci.yml:20-21` runs `vp run verify` as a single step with no `::warning::` and no job summary, so on a green run the line is buried in nine stages of successful output; the `"Confirmed the documented rsvelte limitation. "` prefix simply disappears, which is a diff nobody watches. `check:shadcn` currently runs cache-disabled; once task caching is configured the notice is emitted once and replayed thereafter. Net effect: the vendored `mode-watcher` patch and three probes can outlive the upstream fix indefinitely.

### 4. Nitpick — the limitation is attributed to the wrong package, and neither the parser nor the patched dependency is pinned to what the docs describe

`README.md:64` calls this a "rsvelte 0.5.2" limitation, but the parse error comes from `@rsvelte/vite-plugin-svelte-native@0.3.7` (`pnpm-lock.yaml:1400`), a transitive `^0.3.7` dependency; `pnpm-workspace.yaml`'s `minimumReleaseAgeExclude` covers the lint/check native binaries and the 0.5.2 plugin but not the native parser. The patch key `mode-watcher@1.1.0` (`pnpm-workspace.yaml:24-25`) is pinned exactly while `package.json:34` declares `^1.1.0`, so an in-range bump forces manual regeneration, and the README links the rsvelte issue *index* rather than a filed issue, so the bug's upstream status can't be checked or watched.

### 5. Nitpick — small residue and two carried documentation gaps

`scripts/verify-shadcn-registry.ts:81-83` still rethrows the raw error for the bug-shape probe (`throw multilineRuneError`) — the one remaining path that surfaces an opaque rolldown trace pointing at a temp file the `finally` has already deleted, now inconsistent with the two controls that explain themselves. The Node ≥22.18 floor is still absent from `AGENTS.md` and `skills/build-astro-sites/SKILL.md` (CI pins `node-version: "24"`), and `scripts/verify-preview.ts:40` still keys its inline-styles acceptance on Astro's internal `astro-island,astro-slot` literal, an unexercised branch that would pass vacuously if Astro reformats that shim.

## Outcome

`material findings remain`
