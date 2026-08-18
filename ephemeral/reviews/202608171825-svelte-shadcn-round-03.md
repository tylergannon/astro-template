# Adversarial review — Svelte + shadcn-svelte release candidate (round 03)

## Review target

- Branch `codex/svelte-shadcn`, clean working tree at `1c79d42` ("fix: strengthen release verification"); no tags, not merged, `package.json` version `0.1.0`.
- Whole body of work re-reviewed end to end: `a250b8a` → `89d7f30` → `8640016` → `1c79d42`.
- Proof: `ephemeral/proof/svelte-shadcn-0.1.0/{README.md,headers.txt}`; worklog `ephemeral/worklog/202608171728-svelte-shadcn-rsvelte.md`.

Authoritative requirements: `AGENTS.md` / `CLAUDE.md` (byte-identical), `skills/build-astro-sites/SKILL.md`, and the user's goals — install Svelte plus every installable shadcn-svelte component, update compatible dependencies, use rsvelte tooling everywhere it applies, use ts-go wherever possible, and merge/version only if the application actually works through a compiled Astro preview server with a Svelte island and shadcn components.

The caller imposed no restriction on subject matter, so no narrowing was ignored.

## Evidence inspected and independently reproduced

Read: every config (`package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig.json`, `svelte.config.js`, `astro.config.mjs`, `components.json`, `.oxfmtrc.json`, `rsvelte-lint.json`, `rsvelte-lint.generated.json`, `.github/workflows/ci.yml`), `scripts/verify-shadcn-registry.mjs`, `src/pages/index.astro`, `src/layouts/Layout.astro`, `src/components/SvelteDemo.svelte`, `src/styles/global.css`, all 56 `src/lib/components/ui/*`, `src/lib/hooks`, `src/lib/utils.ts`, README + agent docs + skill, both proof files, the worklog, and all four commits' diffs.

Executed:

| Check | Result |
| --- | --- |
| `vp run verify` (8 stages, now including `astro build`) | **exit 0**, 7.5 s wall — Vite+ fmt/lint, rsvelte-fmt (0/422), rsvelte-lint (1 first-party + 338 generated), ts-go (336 files), `check:shadcn` client+SSR, `astro check` (72 files), `astro build` |
| Proof asset table vs a fresh `astro build` | **all four hashes reproduce byte-for-byte** (`index.html b0a84f12…`, `SvelteDemo.B4wkXbiv.js a9df798a…`, `client.svelte.B0c_jibu.js 27759faa…`, `index.72SPUhtv.css 459bb207…`) |
| Headless Chrome 151 over CDP vs the running preview, re-run at this commit | hydration confirmed on those exact assets: 0 → 3 real clicks, `Svelte clicks: 3` / `Interactive count: 3`, shadcn token background `oklch(0.205 0 0)`, badge variant classes, zero console errors |
| Registry completeness | 56 `registry:ui` items in `registry/index.json`; set difference against `src/lib/components/ui` empty both ways; `is-mobile` (hook) and `utils` (lib) present |
| Dependency currency — every entry queried against npm | all at latest except three correctly held: `typescript ^6.0.3` (7.x breaks `@astrojs/svelte` peer range), `@tanstack/table-core ^8.21.3` (pinned by the registry item), `vaul-svelte 1.0.0-next.7` (registry-specified prerelease). No compatible update is outstanding |
| `pnpm install --frozen-lockfile` | "Already up to date" — lockfile consistent |
| `pnpm peers check` | "No peer dependency issues found" |
| rsvelte redirection | `pnpm-workspace.yaml` override only; lockfile has no upstream `@sveltejs/vite-plugin-svelte`; `@astrojs/svelte`'s slot resolves to rsvelte 0.5.2 |
| `svelte/block-lang` fix probes | `["warn", {"script":"ts"}]` accepts `lang="ts"` at 0 warnings, and does **not** over-constrain plain `<style>` blocks |
| ts-go coverage of the restored typed component | verified from round 02's experiment: `lang="ts"` errors are reported, plain `<script>` errors are not — the restored annotation puts the file back under the gate |
| `ephemeral/**` format exclusion | works in both gates: `vp check` 86 files, `rsvelte-fmt` 0/422, with unformatted review prose present |
| **CI simulation on a deliberately broken tree** (scratch copy, type error injected into `src/lib/components/ui/table/table.svelte`) | `vp check` **exit 0**; `astro check` **0 errors / 72 files**; `astro build` **exit 0** — i.e. all three CI steps green — while the CI-omitted `rsvelte-check --tsgo` reports `Type 'string' is not assignable to type 'number'` (1 error / 336 files) |

Round-01 and round-02 findings are genuinely closed: the gate is green, the corpus is complete at 56/56 and faithful to the registry, suppressions are isolated to generated code, `lang="ts"` is restored with `block-lang` configured to *require* TypeScript, `ephemeral/**` is excluded from both formatters, `astro build` joined `verify`, `check:shadcn` now compiles client **and** SSR with the project's `svelte.config.js`, `@tanstack/table-core` moved to `dependencies`, and the proof's asset table is reproducible. What remains is below.

## Findings

### 1. Critical — CI never runs the gate this work created; it stays green on broken Svelte and TypeScript

`.github/workflows/ci.yml` has not been touched since the pre-Svelte template commit (`git log -- .github/workflows/ci.yml` → only `2e648e4`). Its job is literally named `verify`, yet it runs:

```yaml
- run: vp install --frozen-lockfile
- run: vp check
- run: vp run check:astro
- run: vp run build
```

It never runs `vp run verify`, `rsvelte-fmt --check`, `vp run lint:rsvelte`, `vp run check:rsvelte` (the ts-go gate), or `vp run check:shadcn`. Combined with `vite.config.ts:14` (`typeCheck: false`, which deliberately removed Vite+'s TypeScript pass in favour of `rsvelte-check`), CI now performs **no type checking of any of the 336 Svelte files, no Svelte linting, no Svelte formatting check, and no registry compile check**. `astro check` covers 72 files (2 `.astro` + 65 `.ts` + generated types) and `astro build` only compiles the three components the single page imports, so the other 53 component directories are never compiled in CI at all.

Reproduced on a scratch copy of the current tree with one type error injected into a component no page imports (`src/lib/components/ui/table/table.svelte`):

```
$ vp check              → pass: 77 files formatted, 407 files linted        (exit 0)
$ astro check           → Result (72 files): 0 errors, 0 warnings, 0 hints  (exit 0)
$ astro build           → 1 page(s) built, Complete!                       (exit 0)
# the step CI does not run:
$ rsvelte-check --tsgo --tsconfig tsconfig.json --fail-on-warnings
ERROR …/table.svelte.tsx:7:9 (ts): Type 'string' is not assignable to type 'number'.
svelte-check found 1 error and 0 warnings in 336 files                      (exit 1)
```

Impact: the requirements "use rsvelte tooling everywhere it applies" and "use ts-go wherever possible" are satisfied only by a script a human remembers to run locally; the sole automated enforcement point contradicts them and reports success on a broken repository. This is a template, so every downstream project inherits the same blind CI. The full gate takes 7.5 s wall-clock, so nothing about cost justifies the omission. Versioning `0.1.0` while the automated gate cannot detect regressions in the very corpus this release adds is the same class of problem as round 01's red gate, inverted: green CI, unverified code.

### 2. Issue — the agent-facing instructions never mention `vp run verify`, and their command blocks omit the rsvelte format and lint gates

`AGENTS.md` / `CLAUDE.md` lines 5–13 and `skills/build-astro-sites/SKILL.md` lines 29–37 both list the canonical workflow as `vp install`, `astro dev`, `vp check`, `vp run check:rsvelte`, `vp run check:shadcn`, `vp run check:astro`, `vp run build`. `SKILL.md`'s "Verify changes" section (line 47) repeats the same five commands. Neither document mentions `vp run verify` anywhere — the only command that runs the complete gate, the command `package.json:15` defines, the command the README advertises, and the command the release proof cites as evidence. The rsvelte format and lint passes appear only in a prose sentence, not in either checklist.

Impact: an agent that follows the repository instructions exactly (which `CLAUDE.md` says override default behavior) will skip `rsvelte-fmt --check` and both `rsvelte-lint` passes, then commit code that fails the release gate it never ran — the exact failure mode that produced round 01's red `verify`. The instructions are the durable interface of this template for agents, so a gate that only the README knows about is effectively optional.

### 3. Issue — the release proof's only interactivity evidence is still a citation of the reviewer's run

`ephemeral/proof/svelte-shadcn-0.1.0/README.md`, "Browser evidence": the implementer records that the primary browser runtime had no backends and points at `ephemeral/reviews/202608171815-svelte-shadcn-round-02.md` for the click-through. The cross-reference is now honest and hash-anchored — I re-verified that all four asset hashes in the proof reproduce from a fresh build at this commit, and re-ran the browser check myself here (0 → 3 clicks, no console errors) — so the claim is true today.

It is still a structural weakness for a release gated on "the application actually works": the proof contains no first-party, repeatable procedure for the interactivity claim, and it already went stale once (round 02 caught the same citation pointing at superseded assets). The next rebuild that changes `SvelteDemo` or the CSS will silently invalidate the cross-reference again, because nothing ties the cited evidence to the asset hashes mechanically. A committed script (headless Chrome over CDP against `astro preview`, asserting the counter increments) would make the central claim reproducible by anyone, including CI — and would close finding 1's blind spot for hydration at the same time.

### 4. Nitpick — `check:shadcn`'s SSR externalization is only half-applied

`scripts/verify-shadcn-registry.mjs:10` builds the SSR external list as `Object.keys(packageManifest.dependencies)`, and line 33 passes it to `rollupOptions.external` as a plain array, which matches exact module IDs only. The corpus imports 17 subpath specifiers (`@lucide/svelte/icons/check`, `…/chevron-down`, …) plus `svelte/attachments`, `svelte/elements`, `svelte/reactivity`; none of those match a bare package name, so they are bundled from `node_modules` in the SSR pass while their parent packages are external. It passes today, but the gate's externalization contract is inconsistent, it diverges from Astro's own SSR resolution (which `noExternal`s Svelte packages deliberately), and a future dependency whose subpath needs different plugin include patterns could fail the gate for reasons unrelated to the repository's own code. A regex/predicate external (`(id) => !id.startsWith(".") && !isAbsolute(id) && !id.startsWith("$lib")`) expresses the intent directly. Minor companion: line 10 assumes `dependencies` exists and throws a `TypeError` if a consumer strips it.

### 5. Nitpick — the demo's `let count: number = $state(0)` models an annotation Svelte does not want

`src/components/SvelteDemo.svelte:12` gained an explicit `: number` in `1c79d42`. Inference from `$state(0)` is exact, and the Svelte docs write these as `let count = $state(0)`; the annotation exists only to make the file visibly TypeScript, which `svelte/block-lang: ["warn", {"script":"ts"}]` already guarantees. In a starter template the demo component is the pattern consumers copy, so it teaches redundant annotation. Dropping the annotation keeps both the lint rule and the ts-go gate satisfied.

## Outcome

`material findings remain`
