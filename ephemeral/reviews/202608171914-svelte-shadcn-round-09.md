# Adversarial review — Svelte + shadcn-svelte release candidate (round 09)

## Review target

- Branch `codex/svelte-shadcn`, clean working tree at `1762666` ("fix: make rsvelte limitation probe upgrade-safe"); no tags, not merged into `main`, `package.json` version `0.1.0`.
- Whole body of work re-reviewed end to end (`a250b8a` → … → `6384f66` → `1762666`), with close attention to the new commit: `scripts/verify-shadcn-registry.ts` (three-probe discrimination, non-blocking notice, probe workspace moved into `.astro/`), `README.md:64`, `ephemeral/proof/svelte-shadcn-0.1.0/{README.md,headers.txt}`, worklog.
- Proof: `ephemeral/proof/svelte-shadcn-0.1.0/`; worklog `ephemeral/worklog/202608171728-svelte-shadcn-rsvelte.md`.

Authoritative requirements: `AGENTS.md`/`CLAUDE.md` (symlinked), `skills/build-astro-sites/SKILL.md`, and the user's goals — install Svelte plus every installable shadcn-svelte component, update compatible dependencies, use rsvelte tooling everywhere it applies, use ts-go wherever possible, and merge/version only if the application actually works through a compiled Astro preview server with a Svelte island and shadcn components. The caller imposed no narrowing of subject matter, so nothing was ignored.

## Evidence inspected and independently reproduced

Read: the full `1762666` diff, both gate scripts, `package.json`, `vite.config.ts`, `tsconfig.json`, `astro.config.mjs`, `svelte.config.js`, `rsvelte-lint.json` + `rsvelte-lint.generated.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `patches/mode-watcher@1.1.0.patch`, `.gitignore`, `.github/workflows/ci.yml`, README, `AGENTS.md`, the skill, the proof, the worklog.

Executed:

| Check | Result |
| --- | --- |
| `vp run verify` (9 stages) | **exit 0 in 9.6 s**; `check:shadcn` prints "Confirmed the documented rsvelte limitation. Bundled all 56 shadcn-svelte registry components for client and SSR." |
| Proof asset table at HEAD | **all four entries reproduce byte-for-byte**: 9,407 `7f0f96d4…`, 75,514 `a9df798a…`, 889 `27759faa…`, 148,806 `41c14065…`; `headers.txt` `Content-Length: 9407` matches |
| Hydration + styling (headless Chrome 151 over CDP, round 08, same bytes as HEAD) | 3 real clicks `0→3` on both counters, `oklch(0.205 0 0)` card, `errors: []` |
| **Round-08 finding 1 closed** | the expiry signal is now a non-blocking `console.warn` notice; one-line and no-rune control probes discriminate the bug. I re-ran all three shapes through the gate's own plugin+config: multi-line rune field fails with `Unexpected token`, one-line **builds**, no-rune multi-line **builds** — the discrimination is real, and a healthy upstream fix no longer red-lines `verify` |
| **Round-08 finding 2 closed** | the proof was regenerated from one run: PID 4179, `headers.txt` `Date: 01:12:00`, and the browser paragraph now cites `202608171908-…-round-08.md`, the review that measured the current digests |
| **Probe-relocation hazard I suspected and disproved** | probes now land in `.astro/shadcn-<rand>/` inside the project root and `tsconfig.json:9` includes `**/*`, so an aborted run (`SIGINT` skips the `finally`) leaves deliberately-broken `.svelte.js` files in-tree. I planted one in a scratch checkout and ran `rsvelte-fmt --check .`, `rsvelte-check --tsgo --fail-on-warnings`, `astro check`, and `astro build`: **all four pass and ignore `.astro/`** (gitignored). Not a defect |
| `vp outdated --compatible --long` | no output — no compatible updates, so the proof's claim holds today |
| `vp exec pnpm peers check` | "No peer dependency issues found" |
| Parser provenance | the failing compiler is `@rsvelte/vite-plugin-svelte-native@0.3.7`, a transitive `^0.3.7` dependency of `@rsvelte/vite-plugin-svelte@0.5.2` (`pnpm-lock.yaml:1400`) — see finding 4 |

The candidate is in good shape: green gate, reproducible artifacts, working island, complete corpus, documented compiler limitation with a discriminating probe and a non-blocking expiry signal. The findings below are about what happens when that machinery actually fires.

## Findings

### 1. Issue — when a control probe fails, the gate emits an unattributable stack trace about a file it has already deleted

`scripts/verify-shadcn-registry.ts:47-52` rethrows the raw build error for the two control probes:

```ts
if (singlelineRuneError) { throw singlelineRuneError; }
if (multilinePlainError) { throw multilinePlainError; }
```

The probes are written into `mkdtemp` under `.astro/` and the `finally` block (`:120-122`) removes that directory before the process exits. Reproduced in a scratch checkout by breaking the one-line control:

```
Build failed with 1 error:
[plugin vite-plugin-svelte:compile-module] /private/tmp/citest9/.astro/shadcn-cyi2PJ/singleline-rune-field.svelte.js
RolldownError: Parse(SvelteError { code: "js_parse_error", message: "Unexpected token", span: (73, 73) })
    … 15 frames of rolldown/vite internals …
```

Nothing in that output says which probe failed, that a probe is involved, or what its failure means — and the cited path no longer exists once the run ends. The one-line control exists precisely to detect that the workaround documented at `README.md:64` ("Keep that initializer on one line") has stopped working; the no-rune control detects a broader parser regression. Both are high-signal events whose diagnostic collapses to an opaque trace at exactly the moment they matter. Catching and rethrowing with the probe name and its implication (`the documented one-line workaround no longer compiles under <plugin version>; the mode-watcher patch and README guidance are invalid`) costs two lines and preserves the cause.

### 2. Issue (low) — the expiry notice has no guaranteed reader, so the patch can outlive the bug indefinitely

The new signal is `console.warn("NOTICE: rsvelte now accepts multiline class-field initializers; remove the mode-watcher patch and known-limitation probe.")` (`scripts/verify-shadcn-registry.ts:60-62`). Making it non-blocking was the right call, but nothing routes it to a human: `.github/workflows/ci.yml:20-24` runs `vp run verify` as one step with no `::warning::`, no job summary, and no failure, so on a green run the line sits mid-stream in nine stages of successful output. The prefix `Confirmed the documented rsvelte limitation. ` also silently disappears from the success line when the bug is gone, which is a diff nobody watches. And `check:shadcn` currently runs with `⊘ cache disabled`; the moment task caching is configured for it, the notice is emitted once and replayed or elided thereafter. The practical outcome is the drift round 07 flagged: a vendored patch against `mode-watcher`'s `dist` plus three dead probes surviving long after upstream fixed the compiler. One `::warning::`/`$GITHUB_STEP_SUMMARY` line — or a separate scheduled non-blocking job — gives the notice a reader without touching the release gate.

### 3. Issue (low) — the registry gate still only compiles; 49 of the 56 components are never rendered

`check:shadcn` bundles all 56 for client and SSR (correctly, with dependencies no longer externalized), and the demo page prerenders seven. Nothing renders the rest, so a component that compiles but throws during SSR — missing context provider, namespace-vs-default export mistake — passes `verify`; that class of failure is exactly what a template consumer hits first when they drop a new component onto a page. Generating a fixture page and prerendering it inside the gate would cover all 56 without touching the shipped demo (I rendered 42 by hand in round 06; the repository still contains no equivalent).

### 4. Nitpick — the limitation is attributed to the wrong package, and neither the parser nor the patched dependency is pinned to the version the docs describe

`README.md:64` calls this a "Known rsvelte 0.5.2 limitation", but the parse error comes from `@rsvelte/vite-plugin-svelte-native@0.3.7` (see the trace in finding 1), a transitive `^0.3.7` dependency of the 0.5.2 plugin. A maintainer checking "did upstream fix it?" would compare the wrong version, and `pnpm-workspace.yaml`'s `minimumReleaseAgeExclude` list covers the lint/check native binaries and `@rsvelte/vite-plugin-svelte@0.5.2` but not the native parser packages. Separately, the patch key `mode-watcher@1.1.0` (`pnpm-workspace.yaml:24-25`) is pinned exactly while `package.json:34` declares `^1.1.0`, so an in-range bump forces manual regeneration, and `README.md:64` still links the rsvelte issue *index* rather than a filed issue, so nobody can confirm the bug is reported upstream or watch a specific thread.

### 5. Nitpick — two carried items are still open

The Node ≥22.18 floor — correct in `package.json:66` and `README.md:7`, and required by the `node scripts/*.ts` gate entrypoints — is still absent from `AGENTS.md` and `skills/build-astro-sites/SKILL.md`, the documents `CLAUDE.md` says override default behavior, while CI pins `node-version: "24"` (`.github/workflows/ci.yml:18`). And `scripts/verify-preview.ts:40` still keys its inline-styles acceptance on Astro's internal `astro-island,astro-slot` literal, an unexercised branch that would pass vacuously if Astro reformats that shim.

## Outcome

`material findings remain`
