# Adversarial review — Svelte + shadcn-svelte release candidate (round 05)

## Review target

- Branch `codex/svelte-shadcn`, clean working tree at `6c5684e` ("fix: make verification extensible and typed"); no tags, not merged into `main`, `package.json` version `0.1.0`.
- Whole body of work re-reviewed end to end: `a250b8a` → `89d7f30` → `8640016` → `1c79d42` → `3166d15` → `6c5684e`, with particular attention to the new commit (`README.md`, `package.json`, `scripts/verify-preview.mjs` → `scripts/verify-preview.ts`, `scripts/verify-shadcn-registry.mjs` → `.ts`, worklog).
- Proof: `ephemeral/proof/svelte-shadcn-0.1.0/{README.md,headers.txt}`; worklog `ephemeral/worklog/202608171728-svelte-shadcn-rsvelte.md`.

Authoritative requirements: `AGENTS.md`/`CLAUDE.md` (symlinked, so they cannot drift), `skills/build-astro-sites/SKILL.md`, and the user's goals — install Svelte plus every installable shadcn-svelte component, update compatible dependencies, use rsvelte tooling everywhere it applies, use ts-go wherever possible, and merge/version only if the application actually works through a compiled Astro preview server with a Svelte island and shadcn components. The caller imposed no restriction on subject matter, so no narrowing was ignored.

## Evidence inspected and independently reproduced

Read: the full `6c5684e` diff, both `scripts/*.ts` in their entirety, `package.json`, `tsconfig.json`, `.gitignore`, `src/styles/global.css`, `.github/workflows/ci.yml`, `vite.config.ts`, both lint configs, `src/pages/index.astro`, `src/components/SvelteDemo.svelte`, the 56 `src/lib/components/ui/*` directories, README, agent docs, skill, proof, and worklog.

Executed:

| Check | Result |
| --- | --- |
| `vp run verify` (9 stages) | **exit 0 in 7.9 s** — `vp check` (87 files), `rsvelte-fmt --check` (0/423), both `rsvelte-lint` passes, `rsvelte-check --tsgo` (336 files, 0 errors), `check:shadcn` client+SSR 56/56, `astro check` (73 files, 0 errors), `astro build`, `node scripts/verify-preview.ts` → "served the Svelte island and 3 client assets" |
| **Round-04 finding 1 closed** — second-island extension test on a scratch copy of HEAD | `astro build` + `verify-preview.ts` → **exit 0**, "…and 4 client assets" (was `AssertionError 4 !== 3`) |
| **Round-04 finding 2 closed** — latent type error injected into `scripts/verify-preview.ts:16` (`server.hostname`, `server.prt`) | `rsvelte-check --tsgo` → `Property 'hostname' does not exist on type 'PreviewServer'` / `Did you mean 'port'?`, 2 errors in 336 files (previously the gate passed silently) |
| Round-04 finding 4 closed | `check:preview` now runs `astro build` first, so the standalone command can no longer describe a stale `dist/` |
| Hydration at HEAD (headless Chrome 151 over CDP against the compiled preview) | re-confirmed: 3 real clicks drive `Svelte clicks: 0→3` and `Interactive count: 0→3`, shadcn token background `oklch(0.205 0 0)`, `errors: []` |
| `verify-preview.ts` negative control | removing `client:load` still fails the gate (`Compiled preview is missing <astro-island uid=`) |
| Registry corpus | 56 directories under `src/lib/components/ui`, matching the registry's 56 installable `registry:ui` items |
| `vp outdated --compatible --long` / `pnpm peers check` / `vp install --frozen-lockfile` | no compatible updates; no peer issues; lockfile clean |
| CI | `vp install --frozen-lockfile` + `vp run verify`; proven in round 04 to reject a type error in a never-imported generated component |
| **Proof asset table vs a fresh build at HEAD** | **two of four entries no longer reproduce** (finding 2 below) |
| Tailwind content-source experiment (three builds of HEAD in a scratch tree) | stylesheet content depends on the committed `ephemeral/**` prose (finding 1 below) |

All round-01 through round-04 findings above nitpick level are now closed, and the application demonstrably works through the compiled preview server. The following are what this round establishes.

### 1. Issue — the shipped production stylesheet is a function of the committed review and worklog prose

`src/styles/global.css:1` is a bare `@import "tailwindcss";` with no `@source` scoping, so Tailwind 4's automatic content detection scans every non-git-ignored file in the project root. `.gitignore` covers `dist/`, `.astro/`, `.svelte-check/`, and `node_modules/`, but `ephemeral/**` is deliberately **tracked** (`git ls-files ephemeral` → the proof, four review artifacts, the worklog). Those Markdown files are therefore Tailwind content, and English prose in them is mined for class candidates.

Reproduced with three builds of HEAD in a scratch tree (identical inputs otherwise):

```
build of HEAD as committed            → dist/_astro/index.Bo18qzSi.css   148,946 bytes
same tree with scripts/*.ts renamed back to *.mjs → identical CSS  (extension is not the cause)
same tree with ephemeral/ removed     → dist/_astro/index.BR2__uyd.css   148,899 bytes
$ diff <the two stylesheets>
< .static{position:static}
< .inline{display:inline}
```

The two utilities exist in the release build only because the words "static" and "inline" appear in committed prose (e.g. `ephemeral/proof/svelte-shadcn-0.1.0/README.md`, "completed a static production build"). Impact: every future review round, worklog line, or proof note silently changes the bytes and the content hash of the stylesheet every visitor downloads — unrequested CSS, needless cache-busting, and a build output that is not a function of the application's source. It also means the gate's own artifacts perturb the artifact the gate measures, which is precisely how finding 2 came about. `@source "./src";` (or `@source not "../../ephemeral";`) in `src/styles/global.css` scopes detection to real source and makes the build reproducible from code alone.

### 2. Issue — the release proof's asset table no longer reproduces, and nothing in the gate notices

`ephemeral/proof/svelte-shadcn-0.1.0/README.md:19-24` is the proof's central reproducibility claim: exact bytes and SHA-256 digests for `index.html`, `SvelteDemo.B4wkXbiv.js`, `client.svelte.B0c_jibu.js`, and `index.72SPUhtv.css`. It reproduced byte-for-byte when I checked at `1c79d42` and again at `3166d15`. At HEAD it does not:

| Proof claims | HEAD's `vp run verify` build |
| --- | --- |
| `index.72SPUhtv.css`, 148,923 B, `459bb207…` | `index.Bo18qzSi.css`, **148,946 B**, `bf5b31e5…` — the file the proof names no longer exists |
| `index.html`, 9,407 B, `b0a84f12…` | 9,407 B, **`f1781e83…`** (same length, different bytes: the stylesheet href changed) |
| `SvelteDemo.B4wkXbiv.js`, `a9df798a…` | reproduces |
| `client.svelte.B0c_jibu.js`, `27759faa…` | reproduces |

Two mechanisms are at work and both matter. The proximate cause is finding 1 — committing the round-04 review in `6c5684e` added prose that changed the CSS. The structural cause is that the proof is a hand-written snapshot that no stage of `vp run verify` validates, so it silently decays while CI stays green; the release is gated on evidence that the release no longer matches. A reviewer or consumer who follows the proof's own instructions today fetches assets that do not exist. Either regenerate the table as the last release step and re-verify it (a few lines in `verify-preview.ts` could assert the served asset digests against a committed manifest), or state the digests as observations of a named build rather than as reproducible identities.

### 3. Issue — `engines.node` allows Node versions that cannot run the new TypeScript gate scripts

`6c5684e` converted both verification programs to TypeScript executed directly by Node (`package.json:16-18`: `node scripts/verify-shadcn-registry.ts`, `astro build && node scripts/verify-preview.ts`, and the same invocation inside `verify`). That relies on Node's unflagged type stripping, which arrived in 22.18.0 / 23.6.0. `package.json:65-67` still declares the range it inherited from Astro:

```json
"engines": { "node": ">=22.12.0" }
```

On any Node from 22.12 through 22.17 — permitted by the manifest, and the floor the template advertises — `vp run verify`, `vp run check:shadcn`, and `vp run check:preview` all abort before doing any work:

```
$ node --no-experimental-strip-types scripts/verify-preview.ts     # simulates pre-22.18 default
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts" for …/scripts/verify-preview.ts
```

CI is unaffected (`.github/workflows/ci.yml` pins `node-version: "24"`), which is exactly why this would surface as a contributor-only failure on a green repository. No document mentions a Node floor either — `README.md`, `AGENTS.md`, and the skill are silent. Raise `engines.node` to `>=22.18.0` (or `^22.18.0 || >=24`) and say so in the README prerequisites.

### 4. Nitpick — `verify` re-inlines three script bodies instead of invoking the scripts, and drift already started

`package.json:18` mixes two styles: `vp run lint:rsvelte` and `vp run check:shadcn` are invoked by name, while the format check (`format:rsvelte:check`, line 13), the ts-go check (`check:rsvelte`, line 15), and the preview check (`check:preview`, line 17) are re-typed as raw commands. Those three named entry points are therefore not what the gate runs, and this commit already made the copies diverge: `check:preview` gained an `astro build` prefix while `verify` kept a separate inline `astro build && node scripts/verify-preview.ts`. It happens to be equivalent today, but the divergence class — a named check and the gate's copy of it disagreeing — is exactly the round-03 CI defect at smaller scale. Composing `verify` from `vp run format:rsvelte:check && … && vp run check:rsvelte && …` makes one definition authoritative.

### 5. Nitpick — the smoke test still cannot see styling or interaction

`scripts/verify-preview.ts:40-41` asserts at least one `component-url` and one `renderer-url`, and lines 45-49 assert every scraped asset returns 200 with a non-zero body — the right generalization. But `stylesheetPaths` (line 37) is collected and never required to be non-empty, so a build that emitted no stylesheet at all still passes; and nothing clicks anything, so "the application actually works" continues to rest on my Chrome run (re-confirmed above at HEAD) plus the manual procedure in the proof. Both gaps close in the same file: assert a stylesheet exists unless it was inlined, and drive one click through the already-running `preview()` server.

## Outcome

`material findings remain`
