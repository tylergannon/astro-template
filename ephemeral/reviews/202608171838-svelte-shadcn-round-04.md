# Adversarial review — Svelte + shadcn-svelte release candidate (round 04)

## Review target

- Branch `codex/svelte-shadcn`, clean working tree at `3166d15` ("ci: enforce complete Svelte release gate"); no tags, not merged into `main`, `package.json` version `0.1.0` (up from the template's `0.0.1` at `2e648e4`).
- Whole body of work re-reviewed end to end: `a250b8a` → `89d7f30` → `8640016` → `1c79d42` → `3166d15`, with particular attention to the new commit, which touches `.github/workflows/ci.yml`, `AGENTS.md` (`CLAUDE.md` is a symlink to it), `README.md`, `skills/build-astro-sites/SKILL.md`, `package.json`, `scripts/verify-preview.mjs` (new), `scripts/verify-shadcn-registry.mjs`, `src/components/SvelteDemo.svelte`, and the proof/worklog.
- Proof: `ephemeral/proof/svelte-shadcn-0.1.0/{README.md,headers.txt}`; worklog `ephemeral/worklog/202608171728-svelte-shadcn-rsvelte.md`.

Authoritative requirements: `AGENTS.md`/`CLAUDE.md`, `skills/build-astro-sites/SKILL.md`, and the user's goals — install Svelte plus every installable shadcn-svelte component, update compatible dependencies, use rsvelte tooling everywhere it applies, use ts-go wherever possible, and merge/version only if the application actually works through a compiled Astro preview server with a Svelte island and shadcn components. The caller imposed no restriction on subject matter, so no narrowing was ignored.

## Evidence inspected and independently reproduced

Read: the full `3166d15` diff, plus every config (`package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig.json`, `svelte.config.js`, `astro.config.mjs`, `components.json`, `.oxfmtrc.json`, `rsvelte-lint.json`, `rsvelte-lint.generated.json`, `.github/workflows/ci.yml`), both `scripts/*.mjs`, `src/pages/index.astro`, `src/components/SvelteDemo.svelte`, the 56 `src/lib/components/ui/*` directories, README, agent docs, skill, proof, and worklog.

Executed:

| Check | Result |
| --- | --- |
| `vp run verify` (now 9 stages) | **exit 0 in 7.9 s** — `vp check` (87 files), `rsvelte-fmt --check` (0/423), both `rsvelte-lint` passes (1 + 338 files), `rsvelte-check --tsgo` (336 files, 0 errors), `check:shadcn` client+SSR (56/56), `astro check` (73 files, 0 errors), `astro build`, `check:preview` |
| CI ↔ gate parity | `.github/workflows/ci.yml` is now `vp install --frozen-lockfile` + `vp run verify`; the round-03 gap is closed |
| **CI now rejects broken code** (scratch copy of HEAD, type error injected into the never-imported `src/lib/components/ui/table/table.svelte`) | `vp run verify` **fails** — previously all three CI steps were green on this exact tree |
| Proof asset table vs a fresh build at HEAD | **all four hashes still reproduce byte-for-byte** (`index.html b0a84f12…` 9,407 B; `SvelteDemo.B4wkXbiv.js a9df798a…` 75,514 B; `client.svelte.B0c_jibu.js 27759faa…` 889 B; `index.72SPUhtv.css 459bb207…` 148,923 B) — dropping the `: number` annotation changed no output |
| Documented repeat procedure | `vp exec astro preview --host 0.0.0.0 --background` + `status` work as written; `GET /` → 200 |
| Headless Chrome 151 over CDP at HEAD | hydration re-confirmed on those assets: 3 real clicks drive `Svelte clicks: 0→3` and `Interactive count: 0→3`, shadcn token background `oklch(0.205 0 0)`, badge variant classes present, `errors: []` |
| `check:preview` negative control | removing `client:load` makes it fail (`Compiled preview is missing <astro-island uid=`) — the new smoke test does detect a lost island |
| `check:shadcn` SSR predicate | round-03 finding closed; 56/56 still bundle for client and SSR |
| Registry corpus | 56 directories under `src/lib/components/ui`, matching the registry's 56 `registry:ui` items; hook and lib items present |
| `vp outdated --compatible --long` | no compatible updates outstanding |
| `vp exec pnpm peers check` | "No peer dependency issues found" |
| `vp install --frozen-lockfile` | lockfile clean, 754 entries pass supply-chain policy |
| `AGENTS.md` / `CLAUDE.md` / `SKILL.md` / README | all four now name `vp run verify` as the gate; `CLAUDE.md` is a symlink, so the two agent documents cannot drift |

All five round-03 findings are addressed, and rounds 01–02 remain closed. The application genuinely works through the compiled preview server, the gate is green and now actually enforced in CI, and the corpus, dependencies, and lockfile are clean. What follows is what the new commit introduced or left open.

## Findings

### 1. Issue — the new compiled-preview gate hard-codes the demo page's asset count, so it fails on ordinary extension of the template

`scripts/verify-preview.mjs:31-34` scrapes `component-url`/`renderer-url`/`href` attributes for `/_astro/*.{css,js}` and then asserts an exact cardinality:

```js
assert.equal(new Set(assetPaths).size, 3, "Expected component, renderer, and CSS assets");
```

Three is a property of this one demo page, not of a correct build. Reproduced on a scratch copy of HEAD by adding a second island — the most obvious thing a consumer of a Svelte starter does:

```
# src/pages/index.astro: <SvelteDemo client:load /> + <SvelteDemo2 client:load />
$ astro build          → 1 page(s) built, Complete!   (exit 0)
$ node scripts/verify-preview.mjs
AssertionError [ERR_ASSERTION]: Expected component, renderer, and CSS assets
4 !== 3                                               (exit 1)
```

The site is perfectly correct; the gate is not. Because `3166d15` also reduced CI to the single step `vp run verify`, this now fails the pull request, and the failure message actively misdirects — it names the three asset kinds rather than saying the count changed. The same assertion breaks in the other direction whenever Astro inlines the stylesheet (`build.inlineStylesheets` defaults to `auto`; the current 148 KB CSS is only external because it is large), so trimming the Tailwind surface below the inline threshold also turns the release gate red.

The intent — the component module, the Svelte renderer, and the page CSS are all served and non-empty — is expressible without the brittleness: assert that at least one `component-url` and one `renderer-url` are present, then assert every scraped asset returns 200 with a non-zero body (lines 36-40 already do exactly that for whatever set it finds). Impact: for a template, a gate that can only ever be green on the shipped demo page is a gate every downstream project has to edit or delete before its first feature lands.

### 2. Issue — the verification scripts the whole release now depends on are the one part of the repo ts-go does not check

`tsconfig.json:1-11` extends `astro/tsconfigs/strict`, which sets `allowJs: true` and never sets `checkJs`, and `vite.config.ts` deliberately delegates type-checking to `rsvelte-check` (`typeCheck: false`). The consequence is that `rsvelte-check --tsgo` reports "336 files" of Svelte and TypeScript and type-checks **zero lines** of `scripts/verify-preview.mjs` (45 lines) and `scripts/verify-shadcn-registry.mjs` (57 lines) — the two programs that now constitute the registry and compiled-preview halves of the gate, and that `3166d15` made CI's only safety net. Reproduced on a scratch copy of HEAD by replacing the origin construction at `scripts/verify-preview.mjs:16` with two properties `PreviewServer` does not have:

```js
const origin = `http://${server.hostname ?? "127.0.0.1"}:${server.prt ?? server.port}`;
```

```
$ vp run verify   →  Compiled preview served the Svelte island and all three client assets.
                     exit 0
```

Both typos read `undefined`, both fall through their `??` operators, the gate reports success, and no stage — `vp check` (lint only), `astro check` (73 files, 0 errors), `rsvelte-check --tsgo` (336 files, 0 errors) — says a word. A subtler slip in a rarely-taken branch of these scripts is therefore undetectable, and a silently mis-scoped verification script is the failure mode with the highest blast radius in this design: it can only ever make the gate weaker, never louder. Against the stated requirement to "use ts-go wherever possible", two plain-JS files with no type coverage are exactly the residue the requirement is about. Either write them as `.ts` run through the installed native TypeScript, or set `checkJs: true` and annotate via JSDoc; both are cheap and put the gate under the gate.

### 3. Nitpick — the interactivity claim is still the one release claim nothing automates

`3166d15` added the right things: an HTTP smoke test that proves the island markup, hydration directive, initial reactive labels, and all served assets survive compilation (I confirmed it catches a removed `client:load`), and a written repeat procedure in the proof. But the smoke test never runs a browser, so "the application actually works" — a click changing the rendered count — is still established only by (a) the reviewer's Chrome run cited from `ephemeral/reviews/202608171815-svelte-shadcn-round-02.md` and (b) a manual five-step procedure a human must remember to perform. I re-verified today that the cited evidence is still accurate at this commit and against these exact asset hashes, so nothing is misstated. It remains the last unautomated link: the existing script already boots `preview()` on an ephemeral port, so driving one click through CDP or a headless runner would close it in the same file and make the release's central claim reproducible by CI rather than by citation.

### 4. Nitpick — `check:preview` silently validates whatever `dist/` happens to exist

`scripts/verify-preview.mjs:6-13` calls `preview()` with no freshness check on the output directory. Inside `vp run verify` this is safe because `astro build` runs immediately before it. But `README.md:48` advertises `vp run check:preview` as a standalone command ("Serve and inspect the compiled production output") and the proof's repeat procedure invites the same standalone use, where a green result may describe a `dist/` built from long-superseded source — the stale-evidence trap that round 02 already caught once in the proof's cross-reference. Comparing the newest `src/` mtime against `dist/index.html`, or simply having the script shell out to the build first, keeps the standalone command as trustworthy as the gated one.

### 5. Nitpick — the registry check's two targets no longer exercise the same resolution

`scripts/verify-shadcn-registry.mjs:38` replaced the exact-name external list with `(id) => !id.startsWith(".") && !isAbsolute(id) && !id.startsWith("$lib")`, which correctly fixes round 03's half-applied externalization. Its side effect is that the SSR pass now externalizes *every* bare specifier, so it no longer resolves any dependency import at all: a generated component importing a nonexistent package subpath (e.g. a renamed `@lucide/svelte/icons/*` path) would be caught only by the client pass. That is still adequate coverage — the client pass resolves everything — but the two targets now test different things, which is worth one line of comment in the file so the next person does not read symmetry into it.

## Outcome

`material findings remain`
