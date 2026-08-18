# Adversarial review — Svelte + shadcn-svelte release candidate (round 08)

## Review target

- Branch `codex/svelte-shadcn`, clean working tree at `6384f66` ("fix: isolate rsvelte compatibility coverage"); no tags, not merged into `main`, `package.json` version `0.1.0`.
- Whole body of work re-reviewed end to end (`a250b8a` → … → `32d9936` → `6384f66`), with close attention to the new commit: `scripts/verify-shadcn-registry.ts` (expected-failure probe), `src/components/SvelteDemo.svelte` (Toaster removed), `README.md:64`, `ephemeral/proof/svelte-shadcn-0.1.0/{README.md,headers.txt}`, worklog.
- Proof: `ephemeral/proof/svelte-shadcn-0.1.0/`; worklog `ephemeral/worklog/202608171728-svelte-shadcn-rsvelte.md`.

Authoritative requirements: `AGENTS.md`/`CLAUDE.md` (symlinked), `skills/build-astro-sites/SKILL.md`, and the user's goals — install Svelte plus every installable shadcn-svelte component, update compatible dependencies, use rsvelte tooling everywhere it applies, use ts-go wherever possible, and merge/version only if the application actually works through a compiled Astro preview server with a Svelte island and shadcn components. The caller imposed no narrowing of subject matter, so nothing was ignored.

## Evidence inspected and independently reproduced

Read: the full `6384f66` diff, both gate scripts, `package.json`, `pnpm-workspace.yaml` (`overrides`, `patchedDependencies`, `minimumReleaseAgeExclude`), `patches/mode-watcher@1.1.0.patch`, `src/components/SvelteDemo.svelte`, `src/styles/global.css`, `.github/workflows/ci.yml`, README, `AGENTS.md`, the skill, the proof, and the worklog.

Executed:

| Check | Result |
| --- | --- |
| `vp run verify` (9 stages) | **exit 0 in 8.3 s**; `check:shadcn` prints "Confirmed the documented rsvelte limitation and bundled all 56 shadcn-svelte registry components for client and SSR." |
| Proof asset table at HEAD | **all four entries reproduce byte-for-byte**: `index.html` 9,407 `7f0f96d4…`, `SvelteDemo.B4wkXbiv.js` 75,514 `a9df798a…`, `client.svelte.B0c_jibu.js` 889 `27759faa…`, `index.D11LqwnS.css` 148,806 `41c14065…`; served `Content-Length` 9,407 matches `headers.txt` |
| Hydration + styling at HEAD (headless Chrome 151 over CDP against the compiled preview) | 3 real clicks drive `Interactive count: 0→3` and `Svelte clicks: 0→3`, card background `oklch(0.205 0 0)`, badge variant classes intact, **`errors: []`**; no Sonner markup served, consistent with the demo change |
| **Round-07 finding 1 (documentation) closed** | `README.md:64` now states the rsvelte 0.5.2 `.svelte.js`/`.svelte.ts` multi-line-field limitation, the `[PARSE_ERROR] Unexpected token` symptom, the one-line workaround, and links the correct upstream tracker (`bugs.url` of `@rsvelte/vite-plugin-svelte@0.5.2`) |
| **Round-07 finding 2 closed** | `<Toaster />` removed from the shipped demo; island bundle back to 75,514 B (−33%) and CSS to 148,806 B (−8.7%) versus `32d9936` |
| **Probe discrimination test** (four variants built through the gate's own plugin+config) | `multiline` fails with `Unexpected token`; `singleline` **builds OK**; `multiline_norune` (no `$state` field) **builds OK** — so the probe does isolate the documented bug, not an unrelated failure. But a probe body of `#value = ;;;` also fails with `Unexpected token`, i.e. the matcher cannot distinguish the bug from any other parse error (finding 1) |
| Patch application | lockfile records patch hash `85be9779…`; `vp install --frozen-lockfile` clean; patch is a single semantically identical line rewrite |

The candidate builds, prerenders, serves, hydrates, and styles correctly with all 56 registry components installed, and the two material round-07 findings are genuinely addressed. The findings below concern the mechanism chosen for the expiry signal and the proof document's provenance.

## Findings

### 1. Issue — the release gate now asserts that a third-party bug still exists, so `verify` and CI fail on a healthy upgrade

`scripts/verify-shadcn-registry.ts:29-50` builds a deliberately broken probe and *requires* the failure:

```ts
if (!knownIssueStillPresent) {
  throw new Error("rsvelte now accepts multiline class-field initializers; remove the mode-watcher patch and known-limitation probe.");
}
```

Three concrete consequences:

- **Fails closed on a fix.** `pnpm-workspace.yaml:22` overrides the Svelte plugin with `npm:@rsvelte/vite-plugin-svelte@^0.5.2`, so the first `vp update` (or any resolution without the committed lockfile) that lands a fixed 0.5.3 turns the repo's single release gate red — the same red as a real regression, blocking every unrelated PR until someone edits two files and regenerates the proof. The requirement "update compatible dependencies" is precisely the operation that trips it. An expiry signal does not need to be a blocking assertion: logging a loud notice (or a separate non-gating `check:rsvelte-limitation` script) records the same fact without red-lining the gate.
- **The failure predicate is a substring of an exception message.** `error.message.includes("Unexpected token")` treats *any* parse-level failure as "bug still present". I verified this: replacing the multi-line ternary with `#value = ;;;` also matches, so the probe would stay green while proving nothing. Equally, if rsvelte fixes this bug but rewords an unrelated parse diagnostic, the `throw error` branch surfaces an unrelated error from a script whose name says "verify shadcn registry".
- **The probe does not test the documented scenario in situ.** It is written into `mkdtemp` (`scripts/verify-shadcn-registry.ts:15`), outside the project root, while `README.md:64` documents the hazard for first-party `src/**/*.svelte.js`. Both locations fail identically today (I re-confirmed the in-`src` repro in round 07), but the coupling is incidental: if rsvelte's module transform becomes root-scoped, the probe can flip green — failing the gate — while first-party modules stay broken, or the reverse. A fixture inside `src/` (excluded from the demo's import graph) would test what the README actually promises.

### 2. Issue — the proof's browser evidence is attributed to assets that no longer exist

`ephemeral/proof/svelte-shadcn-0.1.0/README.md:42` states that the reviewer "used local headless Chrome 151 against the exact compiled assets listed above" and cites `ephemeral/reviews/202608171815-svelte-shadcn-round-02.md`. That round-02 run predates `ed1d638`, `32d9936`, and `6384f66`; it measured a different `index.html` and a different hashed CSS/JS set (round 05 documented the `index.72SPUhtv.css` → `index.Bo18qzSi.css` turnover, and the table has changed twice since). No artifact in the repository records a browser interaction against the four digests now in the table.

The same document mixes provenance in its first section: line 10 still reports "PID 94634" from the 00:58 Sonner-era run, while `headers.txt` was regenerated at `01:05:30` with `Content-Length: 9407`. The underlying claims are true — I reproduced every digest and drove three real clicks with `errors: []` at HEAD today — but a proof document is the artifact that has to establish them, and this one currently cites evidence gathered against superseded bytes. This is the third round in which the proof drifted from the tree it describes; the recurring fix is to regenerate all of it from one run, including the browser paragraph.

### 3. Issue (low) — the registry gate still only compiles; 49 of the 56 components are never rendered

`check:shadcn` bundles the corpus for client and SSR (correctly, with dependencies no longer externalized), and the demo page prerenders seven components. Nothing renders the rest, so a component that compiles but throws during SSR — missing context provider, namespace-vs-default export mistake — passes `verify`. Removing `<Toaster />` was right for the starter, but it also removed the only render-level coverage of a component whose SSR dependency graph was the source of the round-06 failure; the compile-only probe is now the sole guard on that path. A generated fixture page prerendered inside the gate would restore render coverage for all 56 without touching the shipped demo (I rendered 42 by hand in round 06; the repository still contains no equivalent).

### 4. Nitpick — the patch is pinned tighter than the dependency it patches, and no upstream issue is referenced

`pnpm-workspace.yaml:24-25` keys the patch to the exact version `mode-watcher@1.1.0` while `package.json:34` declares `^1.1.0`, so an in-range bump leaves the patch key unmatched and forces manual regeneration. `README.md:64` links the rsvelte issue *list* rather than a filed issue, so nobody can check whether the bug is reported, reproduce upstream discussion, or watch for the fix — the only expiry signal is the gate assertion in finding 1.

### 5. Nitpick — two carried items are still open

`scripts/verify-preview.ts:40` keys its inline-styles acceptance on Astro's internal `astro-island,astro-slot` literal, an unexercised branch that would pass vacuously if Astro reformats that shim; and the Node ≥22.18 floor — correct in `package.json:66` and `README.md:7`, and required by the `node scripts/*.ts` gate entrypoints — is still absent from `AGENTS.md` and `skills/build-astro-sites/SKILL.md`, the documents `CLAUDE.md` says override default behavior, while CI pins `node-version: "24"` (`.github/workflows/ci.yml:18`).

## Outcome

`material findings remain`
