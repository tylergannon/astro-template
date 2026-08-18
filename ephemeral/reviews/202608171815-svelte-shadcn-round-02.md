# Adversarial review — Svelte + shadcn-svelte release candidate (round 02)

## Review target

- Branch `codex/svelte-shadcn`, working tree clean at `8640016` ("fix: close Svelte release review findings"), no tags, not merged.
- Full history under review: `a250b8a` → `89d7f30` → `8640016`, re-reviewed end to end rather than as a delta.
- Proof: `ephemeral/proof/svelte-shadcn-0.1.0/README.md` + `headers.txt`. Worklog: `ephemeral/worklog/202608171728-svelte-shadcn-rsvelte.md`.

Authoritative requirements: `AGENTS.md` / `CLAUDE.md` / `skills/build-astro-sites/SKILL.md` (Vite+ task execution, rsvelte for all Svelte tooling, ts-go checking, verification duties) and the user's goals — install Svelte plus every installable shadcn-svelte component, update compatible dependencies, use rsvelte everywhere it applies, use ts-go wherever possible, and merge/version only if the app actually works through a compiled Astro preview server with a Svelte island and shadcn components.

The caller placed no restriction on subject matter, so nothing was ignored as narrowing.

## Evidence inspected and independently reproduced

Read in full: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig.json` (+ `astro/tsconfigs/{strict,base}.json`), `svelte.config.js`, `rsvelte-lint.json`, `rsvelte-lint.generated.json`, `.oxfmtrc.json`, `components.json`, `astro.config.mjs`, `scripts/verify-shadcn-registry.mjs`, `src/pages/index.astro`, `src/layouts/Layout.astro`, `src/components/SvelteDemo.svelte`, `src/styles/global.css`, all 56 `src/lib/components/ui/*`, `src/lib/hooks/is-mobile.svelte.ts`, `src/lib/utils.ts`, README/AGENTS/CLAUDE/SKILL docs, both proof files, the worklog, and the diff of all three commits.

Executed (read-only against tracked files; scratch harnesses under `/tmp`):

| Check                                                                         | Result                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vp run verify` (7 stages)                                                    | **exit 0** — Vite+ format+lint, rsvelte-fmt, both rsvelte-lint passes, ts-go, `check:shadcn`, `astro check` all clean                                                                                             |
| `vp check`                                                                    | pass — 89 files formatted, 407 files linted                                                                                                                                                                       |
| `vp run lint:rsvelte`                                                         | pass — first-party: 1 file; generated config: 338 files                                                                                                                                                           |
| `vp run check:rsvelte` (ts-go)                                                | pass — 336 files, 0/0                                                                                                                                                                                             |
| `vp run check:shadcn`                                                         | pass — "Bundled all 56 shadcn-svelte registry components."                                                                                                                                                        |
| `vp run check:astro`                                                          | pass — 72 files, 0/0/0                                                                                                                                                                                            |
| `vp run build`                                                                | exit 0, 1 route                                                                                                                                                                                                   |
| Proof asset table vs fresh build                                              | **all four hashes reproduce exactly** (`index.html` `b0a84f12…`, `SvelteDemo.B4wkXbiv.js` `a9df798a…`, `client.svelte.B0c_jibu.js` `27759faa…`, `index.72SPUhtv.css` `459bb207…`)                                 |
| Headless Chrome 151 over CDP vs the running preview (current build)           | hydration confirmed on the shipped artifacts: 3 real clicks `Interactive count: 0 → 3`, button `Svelte clicks: 3`, shadcn token background `oklch(0.205 0 0)`, badge variant classes applied, zero console errors |
| Registry completeness                                                         | `registry/index.json`: 56 `registry:ui`; set difference against `src/lib/components/ui` is **empty in both directions** — plus `is-mobile` (`registry:hook`) and `utils` (`registry:lib`)                         |
| `data-table` fidelity vs `registry/data-table.json`                           | faithful — the only deviations are formatter-added trailing commas; `index.ts` byte-identical modulo whitespace                                                                                                   |
| Dependency currency (npm registry)                                            | every dependency at latest; `typescript` correctly held at 6.0.3 (7.0.2 exceeds `@astrojs/svelte`'s `^5.3.3 \|\| ^6.0.0` peer range)                                                                              |
| rsvelte redirection actually in force                                         | `pnpm-workspace.yaml` `overrides` only (the redundant `package.json` alias was removed); lockfile contains **no** upstream `@sveltejs/vite-plugin-svelte`; `@astrojs/svelte`'s slot symlinks to rsvelte 0.5.2     |
| Scratch SSR bundle of all 56 components (deps externalized, as Vite/Astro do) | OK — no SSR-path defect established                                                                                                                                                                               |

Round-01 findings 1 (red gate), 2 (missing `data-table`), 3 (repo-wide lint suppression), and 4 (ts-go ownership documented) are genuinely closed: the gate is green, the corpus is complete at 56/56, suppressions are isolated in `rsvelte-lint.generated.json` scoped to `src/lib/components/ui` + `src/lib/hooks`, and a ts-go probe is recorded. The findings below are what remains — including one regression introduced by the fix commit.

## Findings

### 1. Critical — the fix commit removed TypeScript from the only first-party Svelte component, silently dropping it from the ts-go gate

`8640016` changed `src/components/SvelteDemo.svelte:1` from `<script lang="ts">` to `<script>`. The cause is mechanical: re-enabling the recommended rule set for first-party code (`rsvelte-lint.json` no longer disables `svelte/block-lang`) makes the rule's _default_ option reject any `lang` attribute. Reproduced on a copy of the current component with `lang="ts"` restored and the current first-party config:

```
WARNING ./Demo.svelte:1:0 (svelte): The lang attribute of the <script> block should be omitted.
rsvelte-lint found 0 errors and 1 warning in 1 file      # `--max-warnings 0` ⇒ verify fails
```

Two measured consequences:

**(a) Type checking of that file is gone.** `astro/tsconfigs/base.json` sets `allowJs: true` but never `checkJs`, so a plain `<script>` block is not analyzed. Direct experiment with the repo's own `rsvelte-check --tsgo` over two scratch components:

```
Typed.svelte   (<script lang="ts">, const n: number = "definitely-a-string")
  → ERROR  Type 'string' is not assignable to type 'number'.
Untyped.svelte (<script>, const n = "str"; const bad = n.toFixed(2))
  → no diagnostic
svelte-check found 1 error and 0 warnings in 2 files
```

So the template's only hand-written Svelte component is now the one file the ts-go gate cannot see — directly against "use ts-go wherever possible", and against the README's "strict TypeScript" positioning.

**(b) It bans the convention the rest of the repository uses.** 329 of the generated components are authored `<script lang="ts">`, and that is what `shadcn-svelte` and the Astro Svelte docs emit. Because generated code is now excluded from the first-party config, the rule applies only to code the template's users write: anyone adding a typed Svelte component fails `vp run lint:rsvelte` / `vp run verify` until they discover and edit `rsvelte-lint.json`. For a starter template, that is the highest-traffic path.

The correct fix is one line, and I verified it: `"svelte/block-lang": ["warn", { "script": "ts" }]` (the rule is marked `(options)` in `rsvelte-lint --list-rules`) leaves `lang="ts"` at 0 warnings — and would _enforce_ TypeScript instead of forbidding it. Choosing to delete `lang="ts"` from the component to satisfy a style rule inverted the requirement the rule was supposed to protect.

### 2. Issue — the release proof's central "it works" claim is borrowed from the reviewer and was measured on a superseded build

`ephemeral/proof/svelte-shadcn-0.1.0/README.md`, section "Browser evidence", attributes all interaction evidence to round-01's headless Chrome run and cites `ephemeral/reviews/202608171805-svelte-shadcn-round-01.md`. That run was performed against commit `89d7f30`'s artifacts — `index.BR2__uyd.css` and the pre-fix `index.html` — while the same proof document's asset table now lists `index.72SPUhtv.css` and `index.html` sha `b0a84f12…`, i.e. the post-fix build produced after `SvelteDemo.svelte` was modified and `data-table` was added. The proof therefore presents, as evidence for the shipped artifacts, a measurement taken on artifacts it itself documents as different, and no first-party interactivity evidence exists for the release candidate at all.

Impact: the user's gating condition is that the app _actually works_ in the compiled preview before versioning; the proof satisfies that only by reference, circularly, and for the wrong build. It is also fragile as a process — the release's key claim now depends on a review artifact rather than on a reproducible step the implementer can re-run. (I re-ran the browser check against the current build myself: it hydrates and counts 0→3 with no console errors, so there is no runtime defect here — the defect is in the proof.)

### 3. Issue — round-01's red-gate root cause is untouched; the format gate still scans `ephemeral/**`, so the next proof or review document re-breaks `verify`

Round 01 failed because a hand-written document under `ephemeral/proof/` was not Oxfmt-formatted. The fix reformatted that one file; nothing changed about scope. `package.json:14` still runs `vp check` (whose `*.md` glob covers the whole tree — 89 files) and `rsvelte-fmt --no-native-js --no-native-css --check .`, and neither `.oxfmtrc.json` nor `vite.config.ts` excludes `ephemeral/`, which is a committed directory holding proofs, worklogs, and reviews.

Empirical demonstration, using this very artifact — a normal hand-written review document added under `ephemeral/reviews/`:

```
$ vp check
error: Formatting issues found
ephemeral/reviews/202608171815-svelte-shadcn-round-02.md (109ms)
Found formatting issues in 1 file. Run `vp check --fix` to fix them.
$ echo $?     # 1

$ vp run format:rsvelte:check
rsvelte-fmt: would reformat 1 / 426 files      # exit 1  ⇒ `vp run verify` is red again
```

Impact: the release gate is coupled to the prose formatting of ephemeral documentation, so the identical failure recurs every time an agent writes a proof, worklog, or review and then runs `verify` — exactly the sequence the repository instructions prescribe. Either exclude `ephemeral/**` from both format gates or make writing these documents go through `vp check --fix`; the current state fixes the symptom and leaves the trap.

### 4. Nitpick — `check:shadcn` proves only the client compile path, and the build itself is still outside `verify`

`scripts/verify-shadcn-registry.mjs:25` passes `configFile: false`, so the gate compiles the corpus without the project's `svelte.config.js` (`vitePreprocess`) and without Astro's environment configuration, and it builds only the default client target. Astro renders islands through the SSR compile path first, and that path is never exercised by the gate that claims "the complete installable shadcn-svelte registry corpus compiles together". I bundled all 56 components on the SSR path myself with dependencies externalized (Vite's default, which Astro augments with `noExternal` for Svelte packages) and it succeeded, so no defect is established — the gap is in coverage and in the strength of the proof's wording. Relatedly, `verify` still does not run `astro build`, so the one pipeline that compiles both paths with the real plugin configuration is the one step not in the gate.

### 5. Nitpick — `@tanstack/table-core` sits in `devDependencies` while every other shadcn runtime dependency is a dependency

`package.json:49` places `@tanstack/table-core@^8.21.3` in `devDependencies` (mirroring the registry item's own declaration), whereas `bits-ui`, `embla-carousel-svelte`, `layerchart`, `paneforge`, `vaul-svelte`, `svelte-sonner`, and friends are all runtime `dependencies`. `src/lib/components/ui/data-table/*` imports `@tanstack/table-core` in component code, so the classification is inconsistent with the rest of the corpus and will bite a consumer who installs with `--prod` or consumes this template as a package rather than building it in place. Static builds are unaffected because the import is bundled.

## Outcome

`material findings remain`
