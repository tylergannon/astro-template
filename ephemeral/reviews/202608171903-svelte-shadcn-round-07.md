# Adversarial review — Svelte + shadcn-svelte release candidate (round 07)

## Review target

- Branch `codex/svelte-shadcn`, clean working tree at `32d9936` ("fix: support Sonner through rsvelte SSR"); no tags, not merged into `main`, `package.json` version `0.1.0`.
- Whole body of work re-reviewed end to end: `a250b8a` → `89d7f30` → `8640016` → `1c79d42` → `3166d15` → `6c5684e` → `ed1d638` → `32d9936`, with particular attention to the new commit (`patches/mode-watcher@1.1.0.patch`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `scripts/verify-shadcn-registry.ts`, `src/components/SvelteDemo.svelte`, `README.md`, proof, worklog).
- Proof: `ephemeral/proof/svelte-shadcn-0.1.0/{README.md,headers.txt}`; worklog `ephemeral/worklog/202608171728-svelte-shadcn-rsvelte.md`.

Authoritative requirements: `AGENTS.md`/`CLAUDE.md` (symlinked), `skills/build-astro-sites/SKILL.md`, and the user's goals — install Svelte plus every installable shadcn-svelte component, update compatible dependencies, use rsvelte tooling everywhere it applies, use ts-go wherever possible, and merge/version only if the application actually works through a compiled Astro preview server with a Svelte island and shadcn components. The caller imposed no restriction on subject matter, so no narrowing was ignored.

## Evidence inspected and independently reproduced

Read: the full `32d9936` diff, the patch file, `pnpm-workspace.yaml`, the lockfile's `patchedDependencies` entries, both `scripts/*.ts`, `package.json`, `src/styles/global.css`, `src/components/SvelteDemo.svelte`, `src/lib/components/ui/sonner/*`, the patched `node_modules/mode-watcher/dist/mode-states.svelte.js`, `.github/workflows/ci.yml`, README, agent docs, skill, proof, worklog.

Executed:

| Check | Result |
| --- | --- |
| `vp run verify` (7 composed stages) | **exit 0 in 9.6 s** — `vp check`, `format:rsvelte:check`, both lint passes, `check:rsvelte` (336 files), `check:shadcn` 56/56 client+SSR **with dependencies no longer externalized**, `check:astro`, `check:preview` |
| **Round-06 finding 1 closed for the shipped app** | the demo now renders `<Toaster />`; `astro build` succeeds, `astro preview` serves it, and the served HTML contains Sonner's server-rendered `<section aria-label="Notifications alt+T" …>` inside the island |
| **Round-06 finding 2 closed** | `scripts/verify-shadcn-registry.ts` no longer externalizes bare imports in the SSR pass, so the gate now compiles `mode-watcher` — the exact code path that previously hid the failure |
| Proof asset table at HEAD | **all four entries reproduce byte-for-byte**: `index.html` 9,598 `a70d573a…`, `SvelteDemo.Cz2JDoyx.js` 112,748 `15dae471…`, `client.svelte.DeFOWygR.js` 889 `a7cef768…`, `index.ClR2JS8S.css` 162,912 `59118bb9…`; `headers.txt` Content-Length 9,598 agrees |
| Hydration + styling at HEAD (headless Chrome 151 over CDP) | 3 real clicks drive `Svelte clicks: 0→3` and `Interactive count: 0→3`, card background `oklch(0.205 0 0)`, badge variants intact, **`errors: []`** with the Toaster mounted |
| `vp install --frozen-lockfile` | "Already up to date"; patch hash `85be9779…` recorded in `pnpm-lock.yaml`, so CI applies it deterministically |
| Patch content review | one expression collapsed to a single line; semantically identical, no behavior change |
| **Latent-occurrence scan of every `.svelte.js` in the dependency graph** (702 store packages) | the miscompile shape — a `$state` field followed by a non-rune multi-line field initializer — appears only in the patched `mode-watcher` file; `formsnap`, `paneforge`, and `bits-ui` matches are `$derived.by(...)` runes, which build correctly (confirmed by the round-06 render sweep) |
| **First-party regression probe at HEAD** | the underlying compiler defect is still live (finding 1) |

The release candidate now builds, prerenders, serves, hydrates, and styles correctly with all 56 registry components installed and the previously fatal one actually rendered — the strongest state this work has been in. The findings below concern the residue of that fix.

## Findings

### 1. Issue — the rsvelte defect is still live for first-party code; the patch treats the one symptom and the README describes it as a `mode-watcher` quirk

`patches/mode-watcher@1.1.0.patch` collapses one multi-line class-field ternary in one dependency file. The compiler bug it works around is unchanged, and it fires on ordinary first-party source. Reproduced on a clean scratch checkout of HEAD — a `.svelte.js` rune module (the canonical Svelte 5 way to share reactive state) imported by the existing demo component:

```js
// src/lib/probe.svelte.js
export class T {
  #a = $state(0);
  #b = true
    ? 1
    : 2;
  get a() { return this.#a; }
  get b() { return this.#b; }
}
```

```
$ astro build
[PARSE_ERROR] Unexpected token
   ╭─[ src/lib/probe.svelte.js:7:3 ]
```

`README.md:64` is the only place the hazard is recorded, and it frames it as dependency-specific: "`mode-watcher` carries a narrow source patch for an rsvelte SSR rune-transform bug; the rendered Sonner demo and full registry gate keep the workaround covered". Both halves understate the situation. A consumer of this template who writes the pattern above in their own `src/lib/*.svelte.js` gets an opaque `PARSE_ERROR` with no hint that the project's Svelte compiler was substituted (`pnpm-workspace.yaml:22`) or that a single-line initializer is the workaround; and the gate cannot warn them, because no `.svelte.js` module exists in `src/`, so the whole code path is unexercised by `verify`. The worklog records the mechanism accurately (`friction:` line) but the worklog is not consumer documentation, and nothing anywhere links an upstream rsvelte issue.

For a template whose premise is "Svelte compilation is redirected through `@rsvelte/vite-plugin-svelte`" (`AGENTS.md`), a known miscompile of a mainstream Svelte 5 pattern belongs in the README as a limitation with the recognizable symptom and workaround, plus a first-party `.svelte.js` fixture in the gate — one file with a multi-line initializer would fail today and pass the moment rsvelte fixes it, which is also the missing signal in finding 3.

### 2. Issue — gate coverage was installed into the shipped demo, and every consumer pays for it

`src/components/SvelteDemo.svelte:11,38` add `import { Toaster } … ` and `<Toaster />` to the template's landing-page island, explicitly as regression coverage for finding 1 (`README.md:64`: "the rendered Sonner demo … keep[s] the workaround covered"). The cost is measurable in the proof's own table, comparing `ed1d638` to `32d9936`:

| Asset | before | after |
| --- | --- | --- |
| island bundle | 75,514 B | **112,748 B (+49%)** |
| stylesheet | 148,806 B | **162,912 B (+9.5%)** |
| `index.html` | 9,407 B | 9,598 B |

Every project generated from this starter therefore ships `svelte-sonner`, `mode-watcher`, and five Lucide icons in its first island, plus an always-mounted `aria-live` notifications region on the landing page, whether or not it uses toasts. The demo's job is to show a Svelte island composed from shadcn components; the regression's job is to keep `sonner` compiling. A fixture page that only the gate builds (or prerendering the corpus inside `check:shadcn`, per round 06) achieves the second without taxing the first. If the Toaster is meant as a deliberate starter feature rather than coverage, that is a legitimate choice — but then it should be documented as a feature and the coverage should still live in the gate, because deleting the Toaster from the demo would silently delete the regression test.

### 3. Nitpick — the vendor patch has no expiry and is pinned tighter than the dependency it patches

`pnpm-workspace.yaml:24-25` and `pnpm-lock.yaml` key the patch to the exact version `mode-watcher@1.1.0`, while `package.json:34` declares `^1.1.0`. Any in-range bump therefore leaves the patch key unmatched, so the next dependency refresh either fails on an unapplied patch or proceeds without it — with `check:shadcn` as the only thing standing between that and a broken build (which the proof now states, correctly). Nothing tells a maintainer when the patch can go: no upstream issue reference, no rsvelte version noted as the fix target, and no failing-on-fix signal, so the patched vendor file will outlive its cause indefinitely. Two lines in the README (or a comment atop the patch) naming the rsvelte version tested and the upstream tracker would make it removable.

### 4. Nitpick — the registry gate compiles the corpus but still never renders it

Removing the SSR externals was the right fix, and 56/56 components now compile for both targets. Rendering remains untested: only the seven components on the demo page are ever prerendered by `astro build`, so a component that compiles but throws during SSR (missing provider, namespace-vs-default export mistake) still passes `verify`. I rendered 42 of the 56 through three scratch pages in about a minute of wall clock during round 06; a generated fixture page in `check:shadcn` would make that coverage permanent instead of anecdotal.

### 5. Nitpick — two round-06 nitpicks are still open

`scripts/verify-preview.ts:40` keys its inline-styles acceptance on Astro's internal `astro-island,astro-slot` literal, an unexercised branch that would pass vacuously if Astro reformats that shim; and the Node 22.18 floor now correct in `package.json:66` and stated in `README.md:7` is still absent from `AGENTS.md` and `skills/build-astro-sites/SKILL.md`, the documents `CLAUDE.md` says override default behavior.

## Outcome

`material findings remain`
