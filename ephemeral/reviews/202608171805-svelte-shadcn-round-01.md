# Adversarial review — Svelte + shadcn-svelte release candidate (round 01)

## Review target

- Branch `codex/svelte-shadcn`, working tree at `/Users/tyler/src/astro-template-svelte-shadcn` (clean, no tags, not merged).
- Commits `a250b8a` (feat: add Svelte and complete shadcn-svelte registry) and `89d7f30` (chore: prepare v0.1.0 release proof).
- Release proof `ephemeral/proof/svelte-shadcn-0.1.0/README.md` and `headers.txt`.

Requirements reviewed against: `AGENTS.md`/`CLAUDE.md` (Vite+ task execution, rsvelte toolchain for Svelte, ts-go checking, `build-astro-sites` verification), and the user's stated goals — install Svelte plus every installable shadcn-svelte component, update compatible dependencies, use rsvelte everywhere it applies, use ts-go wherever possible, and merge/version only if the app actually works through a compiled Astro preview server with a Svelte island and shadcn components.

No caller instruction narrowed the scope, so no narrowing was ignored.

## Evidence inspected and independently reproduced

Read: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` (alias resolution), `vite.config.ts`, `tsconfig.json`, `svelte.config.js`, `rsvelte-lint.json`, `.oxfmtrc.json`, `components.json`, `astro.config.mjs`, `src/pages/index.astro`, `src/layouts/Layout.astro`, `src/components/SvelteDemo.svelte`, `src/styles/global.css`, the 55 directories under `src/lib/components/ui`, `ephemeral/worklog/202608171728-svelte-shadcn-rsvelte.md`, both proof files.

Executed (read-only w.r.t. tracked files; scratch work in `/tmp`):

| Check                                                                              | Result                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vp run verify`                                                                    | **fails** — stops in the first gate                                                                                                                                                                                                                                                     |
| `vp check`                                                                         | **exit 1** — `ephemeral/proof/svelte-shadcn-0.1.0/README.md` unformatted                                                                                                                                                                                                                |
| `vp run format:rsvelte:check`                                                      | **exit 1** — same file, `would reformat 1 / 418`                                                                                                                                                                                                                                        |
| `vp run lint:rsvelte`                                                              | exit 0 — 0 errors / 0 warnings, 337 files                                                                                                                                                                                                                                               |
| `vp run check:rsvelte` (ts-go)                                                     | exit 0 — 0 errors / 0 warnings, 335 files                                                                                                                                                                                                                                               |
| `vp run check:astro`                                                               | exit 0 — 68 files, 0/0/0                                                                                                                                                                                                                                                                |
| `vp run build`                                                                     | exit 0 — 1 page, `dist/` regenerated                                                                                                                                                                                                                                                    |
| `astro preview` + `curl`                                                           | HTTP 200, 9,407 bytes, `astro-island … client="load"` present                                                                                                                                                                                                                           |
| Headless Chrome 151 over CDP against the preview server                            | **hydration and interactivity confirmed**: `Interactive count: 0` → 3 real clicks → `Interactive count: 3`, button text `Svelte clicks: 3`, shadcn Card token background `oklch(0.205 0 0)`, badge variant classes applied, zero console errors                                         |
| Scratch Vite lib build importing all 55 `ui/*/index.js` through the rsvelte plugin | **OK** — 1.44 MB ESM + 21 KB CSS, no compile/resolve failures                                                                                                                                                                                                                           |
| Dependency currency vs npm registry                                                | `svelte 5.56.9`, `astro 7.2.2`, `@astrojs/svelte 9.0.1`, `bits-ui 2.18.1`, `layerchart 2.2.0`, `shadcn-svelte 1.5.0`, all `@rsvelte/*` — all at latest; `typescript` held at 6.0.3 because 7.0.2 exceeds `@astrojs/svelte`'s `^5.3.3 \|\| ^6.0.0` peer range (correct)                  |
| rsvelte redirection actually in effect                                             | `pnpm-workspace.yaml overrides` maps `@sveltejs/vite-plugin-svelte` → `@rsvelte/vite-plugin-svelte@^0.5.2`; the lockfile contains **no** upstream `@sveltejs/vite-plugin-svelte` entry, and `@astrojs/svelte`'s slot symlinks to rsvelte 0.5.2; `vitePreprocess` resolves to a function |
| shadcn registry corpus                                                             | `https://shadcn-svelte.com/registry/index.json` → 206 items: 56 `registry:ui`, 147 `registry:block`, 1 `registry:hook`, 1 `registry:lib`, 1 `registry:style`. Installed: 55 ui + `is-mobile` hook + `utils` lib                                                                         |

Substantively, the core "does it work" bar is met: the compiled preview server serves a real Svelte island built from shadcn-svelte source components, and it hydrates and responds to real clicks. The findings below are about the gate, corpus completeness, and toolchain coverage.

## Findings

### 1. Critical — the v0.1.0 release commit breaks the repository's own verification gate

`89d7f30` bumps `package.json` to `0.1.0` (`package.json:3`) and, in the same commit, adds `ephemeral/proof/svelte-shadcn-0.1.0/README.md` in a form that fails two of the five gates the release itself defines in `package.json:14` (`verify`).

Reproduction from a clean checkout of `89d7f30`:

```
$ vp check
error: Formatting issues found
ephemeral/proof/svelte-shadcn-0.1.0/README.md (62ms)
Found formatting issues in 1 file. Run `vp check --fix` to fix them.
$ echo $?            # 1  → `vp run verify` never reaches rsvelte-lint/ts-go/astro check
$ vp run format:rsvelte:check
ephemeral/proof/svelte-shadcn-0.1.0/README.md (59ms)
rsvelte-fmt: would reformat 1 / 418 files    # exit 1
```

Impact: the proof asserts "`vp run verify` passed … with zero errors or warnings," but that statement cannot be true of the committed tree — the proof artifact was written after the last passing run and is itself inside the formatter's scope (`rsvelte-fmt … .` and `vp check`'s `*.md` glob). The release is therefore versioned on a red gate, and the first thing any consumer or CI run of this template does is fail. The user's own condition ("merge/version only if the application actually works") is violated at the gate level even though the runtime behaves. Fix is trivial (`vp check --fix`), but it must precede versioning, and the proof needs a re-run of `verify` against the final commit.

### 2. Issue — "every installable shadcn-svelte component" is 55 of 56; `data-table` is missing and the worklog's justification is factually wrong

The v1.5.0 registry index lists **56** `registry:ui` items; `src/lib/components/ui` contains **55**. The missing one is `data-table`, which is a genuinely installable source component, not a composition:

```
$ curl -s https://shadcn-svelte.com/registry/data-table.json | head
{"$schema": ".../registry-item.json",
 "name": "data-table", "type": "registry:ui",
 "devDependencies": ["@tanstack/table-core@^8.21.3"],
 "files": [ { "content": "import { type RowData, type TableOptions, …" } ] }
```

`ephemeral/worklog/202608171728-svelte-shadcn-rsvelte.md:4` records the opposite as settled fact: "the v1.5.0 Vega registry has no installable items with those names" — listing `combobox, data-table, date-picker, typography`. Three of those four are indeed absent from the registry (verified: `combobox`, `date-picker`, `typography` → ABSENT), but `data-table` is present, typed `registry:ui`, and carries files plus a `@tanstack/table-core` dependency that is absent from `package.json`. The proof README then inherits the error ("the official `shadcn-svelte add --all` result contains 55 component directories" presented as "the complete installable registry corpus").

Impact: the headline requirement is one component short, the shortfall is documented as impossible rather than as a gap, and `@tanstack/table-core` is missing from the dependency set — so a template consumer running `shadcn-svelte add data-table` gets a dependency install the "complete" template claimed to have already resolved and type-checked.

### 3. Issue — the lint gate was weakened repository-wide to make the vendored corpus pass

`rsvelte-lint.json` disables ten recommended rules globally (`svelte/block-lang`, `no-at-const-tags`, `no-inline-styles`, `no-unused-class-name`, `prefer-const`, `prefer-derived-over-derived-by`, `require-optimized-style-attribute`, plus three navigation rules). The worklog states the motive plainly: the unconfigured linter reported 610 warnings over the source-installed shadcn corpus and `lint:rsvelte` runs `--max-warnings 0` over all of `src/`.

Impact: the suppression is not scoped to the vendored directory. `src/lib/components/ui/**` is third-party generated code, but this file also silences `prefer-const`, `prefer-derived-over-derived-by`, `no-unused-class-name`, and `no-inline-styles` for every component a consumer of this template writes afterwards — which is the code the gate exists to protect. Because the template's selling point is a preconfigured toolchain, the weakened defaults propagate to every downstream project. Scoping the overrides to the generated `ui` (and `hooks`) paths, or excluding the vendored corpus from the `--max-warnings 0` sweep, preserves both a green gate and the recommended ruleset for first-party code.

### 4. Issue — ts-go no longer type-checks the 64 `.ts` files; only the 335 `.svelte` files reach it

`vite.config.ts:12-14` sets `lint.options.typeCheck: false`, handing type ownership to `rsvelte-check --tsgo`. Measured coverage: `check:rsvelte` reports 335 files (the `.svelte` corpus), while the repository holds 64 `.ts` files (55 generated `ui/*/index.ts`, `src/lib/utils.ts`, hooks, config). Those `.ts` files are now checked only by `astro check` (68 files), which runs on the classic TypeScript compiler, not the native preview.

Impact: against the "use ts-go wherever possible" requirement, the change swaps ts-go coverage of first-party TypeScript for tsc coverage, and it does so silently — nothing in `AGENTS.md`/`CLAUDE.md` or the README records that `vp check` no longer type-checks. The documented friction (raw ts-go trips over Astro's wildcard `.svelte` declaration) justifies not pointing bare `tsgo` at the whole project, but not dropping ts-go from `.ts` entirely: a second tsgo pass over a tsconfig that excludes `**/*.svelte` would restore it. At minimum the disabled pass belongs in the documented command table so consumers know which checker owns what.

### 5. Nitpick — the release proof under-verified interactivity while a usable browser was available, and the rsvelte alias is declared twice

(a) The proof's "Evidence limitation" section says no browser backend was available, so hydration was argued from SSR markup plus a grep of the compiled bundle. A local Chrome 151 was in fact present and sufficient: driving it headlessly over CDP against the same preview server produced direct evidence (3 clicks → `Interactive count: 3`, no console errors). The claim in the proof is honest but weaker than the machine allowed, and the user's bar was explicitly about the app _working_, so the strongest available evidence should have been captured before versioning.

(b) The rsvelte redirection is declared in two places with different specifiers: `pnpm-workspace.yaml` `overrides: "@sveltejs/vite-plugin-svelte": "npm:@rsvelte/vite-plugin-svelte@^0.5.2"` (the mechanism rsvelte's own README documents, and the one the lockfile honors) and `package.json:47` `"@sveltejs/vite-plugin-svelte": "npm:@rsvelte/vite-plugin-svelte@0.5.2"` pinned exactly. The duplicate is currently harmless but can drift on the next bump, leaving a confusing two-source-of-truth alias. Relatedly, `vite.config.ts`'s `staged` hook maps any staged `*.svelte` file to a whole-repository format (`rsvelte-fmt … .`) plus full `src/` lint and check, which can pull unrelated reformatting into a commit.

## Outcome

`material findings remain`
