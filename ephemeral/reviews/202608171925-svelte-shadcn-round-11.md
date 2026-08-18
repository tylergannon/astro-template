# Adversarial review — Svelte + shadcn-svelte release candidate (round 11)

## Review target

- Branch `codex/svelte-shadcn`, clean working tree at `da0c690` ("fix: make the starter theme consistently dark"); no tags, not merged into `main`, `package.json` version `0.1.0`.
- Whole body of work re-reviewed end to end (`a250b8a` → … → `fee7f3a` → `da0c690`), with close attention to the new commit: the deleted `.dark` block and rewritten `:root` in `src/styles/global.css`, tokenized `src/pages/index.astro`, the hand-edited `src/lib/components/ui/sonner/sonner.svelte`, the removal of `mode-watcher` and `patches/mode-watcher@1.1.0.patch`, `README.md:64-65`, and the regenerated proof.
- Proof: `ephemeral/proof/svelte-shadcn-0.1.0/`; worklog `ephemeral/worklog/202608171728-svelte-shadcn-rsvelte.md`.

Authoritative requirements: `AGENTS.md`/`CLAUDE.md` (symlinked), `skills/build-astro-sites/SKILL.md`, and the user's goals — install Svelte plus every installable shadcn-svelte component, update compatible dependencies, use rsvelte tooling everywhere it applies, use ts-go wherever possible, and merge/version only if the application actually works through a compiled Astro preview server with a Svelte island and shadcn components. The caller imposed no narrowing of subject matter, so nothing was ignored.

## Evidence inspected and independently reproduced

Read: the `da0c690` diff in full, `src/styles/global.css`, `src/layouts/Layout.astro`, `src/pages/index.astro`, `src/components/SvelteDemo.svelte`, `src/lib/components/ui/sonner/*`, `components.json`, `scripts/verify-shadcn-registry.ts`, `scripts/verify-preview.ts`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`, README, `AGENTS.md`, the skill, proof, worklog, plus the pre-edit generated component at `a250b8a`.

Executed:

| Check | Result |
| --- | --- |
| `vp run verify` (9 stages) | **exit 0**; `rsvelte-fmt` 87 files, `vp check` 408 files, rsvelte lint 1 + 338, `rsvelte-check --tsgo` 336 files 0/0, `check:shadcn` "Confirmed the documented rsvelte limitation. Bundled all 56 …", `astro check` 0 errors, preview smoke test green |
| Proof asset table at HEAD | **all four entries reproduce**: `index.html` 9,416 `27ba0ac5…`, `SvelteDemo.B4wkXbiv.js` 75,514 `a9df798a…`, `client.svelte.B0c_jibu.js` 889 `27759faa…`, `index.Ba1z4j3d.css` 147,769 `6456fb3d…`; `headers.txt` `Content-Length: 9416` agrees |
| **Round-10 finding 1 closed** (CDP against the compiled preview) | `color-scheme: dark`, body `oklch(0.145 0 0)`, gradient resolves through `color-mix` to `oklch(0.488 0.243 264.376 / 0.35)`, eyebrow `oklch(0.922 0 0)`, hero `oklch(0.708 0 0)`, CTA `oklch(0.922)` on `oklch(0.205)` text, card `oklch(0.205)`/`oklch(0.985)` — one coherent dark theme with no raw hex, no unreachable palette, `class="dark"` retained so the `dark:` variant utilities inside the 56 components still resolve; 2 real clicks hydrate to `Interactive count: 2`, `errors: []` |
| Dependency removal | `mode-watcher` is gone from `package.json`, `pnpm-lock.yaml`, and `node_modules`; `patchedDependencies` and the patch file are deleted; no `src/` reference remains — the round-07/09 vendored-patch concerns are void |
| **Registry-drift reproduction** | restoring the CLI-generated `sonner.svelte` from `a250b8a` into a scratch checkout of HEAD makes `check:shadcn` fail: `Rolldown failed to resolve import "mode-watcher" from ".../ui/sonner/sonner.svelte"` (finding 1) |
| `vp outdated --compatible --long` / `vp exec pnpm peers check` | no compatible updates; no peer issues |

The theme is now genuinely coherent, the vendored patch is gone, and every proof digest reproduces. The findings below are about the cost of how the theme fix was applied and about the proof's citation discipline.

## Findings

### 1. Issue — a generated registry component was hand-edited and its dependency deleted, with the divergence recorded nowhere

`src/lib/components/ui/sonner/sonner.svelte` no longer matches what the registry generates: the commit deleted `import { mode } from "mode-watcher"` and replaced `theme={mode.current}` with `theme="dark"` (`:15`), and `package.json` dropped `mode-watcher` entirely. `README.md:62` still tells maintainers "The shadcn CLI remains installed for registry updates", and `components.json` is unchanged, so `shadcn-svelte add sonner --overwrite` (or `update`) is the documented, expected operation — and it restores an import of a package that is no longer installed. Reproduced on a scratch checkout of HEAD by restoring the generated file:

```
Build failed with 1 error:
Error: [vite+]: Rolldown failed to resolve import "mode-watcher" from ".../src/lib/components/ui/sonner/sonner.svelte".
```

The gate does catch it, which limits the blast radius, but the diagnostic is an "unintended externalization" message that says nothing about a deliberate local edit, and nothing in `README.md`, `components.json`, the file itself, or `AGENTS.md` records that this one registry file is intentionally divergent or why the dependency was removed. The worklog's framing ("remove the incompatible mode-watcher runtime") is also inaccurate: `mode-watcher` compiled fine once its one field initializer was on a single line — it was dropped for theme reasons, not compatibility. Two cheaper shapes avoid the drift entirely: keep `mode-watcher` (its `mode.current` is the registry's contract) and pass `theme="dark"` at the usage site, since the wrapper already spreads `{...restProps}` after `theme`; or keep the edit and record it — a comment in the file plus a README line naming the file, the change, and the removed dependency, so the next registry refresh is not a surprise.

### 2. Issue (low) — the proof's browser evidence now cites an unnamed, forward-looking artifact, and again describes assets it did not measure

`ephemeral/proof/svelte-shadcn-0.1.0/README.md:42` was changed from a specific review filename to "…and zero console errors in the final adversarial review artifact." That citation is unresolvable — no such file exists, and the only committed browser evidence (`202608171918-…-round-10.md`) measured the *previous* stylesheet, 148,806 B / `41c14065…`, whereas the table two sections above now lists 147,769 B / `6456fb3d…`. So the sentence's claim of "the exact compiled assets listed above" is false for every artifact that exists, and it forward-references a document that has not been written. This is the third round in which the proof's interaction claim lags the tree it describes; I did re-drive the compiled preview at HEAD today (hydration to `Interactive count: 2`, `errors: []`, tokens as tabulated above), but the proof has to stand on its own, and pointing at "the final" review makes it permanently unverifiable.

### 3. Issue (low) — nothing renders the modified wrapper, or 49 of the other registry components

`check:shadcn` bundles all 56 for client and SSR; the demo prerenders seven, and `<Toaster />` was removed from it in `6384f66`. The component this commit hand-edited is therefore compile-checked only — an SSR-time break in it (or in any of the other 48 unrendered components) passes `verify`. A generated fixture page prerendered inside the gate would cover all 56 without touching the shipped demo; that is now the last structural coverage gap in an otherwise complete release gate.

### 4. Nitpick — shadcn's light palette was deleted rather than parked

The commit removes the light token values outright and `README.md:64` says "Add an explicit theme switcher before introducing light or system mode" — a legitimate, now-coherent choice, but the values a consumer needs in order to follow that advice no longer exist anywhere in the repository. A commented-out `:root` light block, or a README pointer to the shadcn-svelte `neutral` base-color tokens, keeps the door open at zero cost.

### 5. Nitpick — carried residue

`README.md:65` attributes the parse bug to "rsvelte 0.5.2", but it lives in `@rsvelte/vite-plugin-svelte-native@^0.3.7` (transitive; `pnpm-lock.yaml`), so a maintainer checks the wrong version for a fix, and `minimumReleaseAgeExclude` does not cover the native parser packages. The non-blocking `NOTICE` in `scripts/verify-shadcn-registry.ts:84-88` still has no CI reader (no `::warning::`, no job summary in `.github/workflows/ci.yml:20-21`). `scripts/verify-shadcn-registry.ts:81-83` still rethrows a raw rolldown error for the bug-shape probe, pointing at a temp file the `finally` has deleted, unlike the two controls that now explain themselves. The Node ≥22.18 floor is still absent from `AGENTS.md` and `skills/build-astro-sites/SKILL.md`. `scripts/verify-preview.ts:40` still keys inline-style acceptance on Astro's internal `astro-island,astro-slot` literal, an unexercised branch.

## Outcome

`material findings remain`
