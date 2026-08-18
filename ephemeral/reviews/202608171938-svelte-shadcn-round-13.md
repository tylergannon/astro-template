# Adversarial Review — Round 13

## Review target

Repository: `/Users/tyler/src/astro-template-svelte-shadcn`, branch `codex/svelte-shadcn`,
HEAD `f8f6a02` "docs: disclose the SvelteKit form boundary", clean working tree,
version `0.1.0`, unmerged and untagged.

Authoritative requirements (original user request, `CLAUDE.md`, `AGENTS.md`,
`README.md`, `skills/build-astro-sites/SKILL.md`):

1. Install Svelte and every installable shadcn-svelte component.
2. Update every compatible dependency.
3. Use the rsvelte toolchain everywhere it applies.
4. Use ts-go wherever possible.
5. Merge/version only if the application actually works — a compiled Astro
   preview server serving a hydrated Svelte island built from shadcn components.

The launch prompt supplied only an artifact path and a read-only constraint; it
narrowed no subject matter, so the full scope above was reviewed.

## Evidence inspected

- `git log`, `git show f8f6a02` (full diff: `README.md:67`,
  `scripts/verify-shadcn-registry.ts:124-128`, proof README, worklog, the
  committed round-12 artifact), `git status --porcelain` (clean).
- `scripts/verify-preview.ts` (61 lines, read in full),
  `scripts/verify-shadcn-registry.ts`, `package.json`, `pnpm-workspace.yaml`,
  `pnpm-lock.yaml`, `.github/workflows/ci.yml`, `README.md`, `AGENTS.md`.
- `ephemeral/proof/svelte-shadcn-0.1.0/README.md` in full.
- `vp run verify` at `f8f6a02`: green across all nine stages
  (`Compiled preview served the Svelte island and 3 client assets.`).
- Rebuild digests: `dist/index.html` 9,416 B `27ba0ac5`,
  `SvelteDemo.B4wkXbiv.js` 75,514 B `a9df798a`,
  `client.svelte.B0c_jibu.js` 889 B `27759faa`,
  `index.Ba1z4j3d.css` 147,769 B `6456fb3d`, plus
  `client.BA1RN6yK.js` 39,692 B `584122fd` (see findings 1 and 2).
- CDP against `astro preview` (headless Chrome 151, port 9333): baseline
  `Interactive count: 0 → 3`, `Svelte clicks: 0 → 3`, card
  `oklch(0.205 0 0)`, `errors: []`.
- Round-12 verification of the fix commit: `README.md:67` now documents the
  `form` boundary, `check:shadcn`'s success line no longer overclaims, and the
  proof distinguishes compilation coverage from instantiation. Round-12 findings
  1 and 2 are addressed at the documentation level; findings 3, 4 and 5 are
  untouched (see finding 5).
- Dependency checks: `pnpm why @sveltejs/vite-plugin-svelte` resolves to exactly
  one version, `@rsvelte/vite-plugin-svelte@0.5.2` (requirement 3 holds);
  `formsnap@2.0.1`'s `dist` contains no `$app/` import (see finding 4).

## Findings

### 1. `check:preview` — the only gate for requirement 5 — passes with hydration completely dead — critical

`scripts/verify-preview.ts:31-56` collects assets only from attributes present
in the served HTML (`component-url`, `renderer-url`, `href="…css"`) and fetches
just those. Astro's renderer entry `client.svelte.B0c_jibu.js` statically imports
`/_astro/client.BA1RN6yK.js` (39,692 B — the Svelte hydration runtime, and the
largest JavaScript chunk in the island's graph). That import appears nowhere in
the HTML, so the gate never requests it.

Reproduced at `f8f6a02` after a clean `vp run build`:

```
$ mv dist/_astro/client.BA1RN6yK.js /tmp/client.chunk.bak
$ node scripts/verify-preview.ts
Compiled preview served the Svelte island and 3 client assets.
verify-preview exit=0
```

The same missing-chunk build in a real browser (CDP, headless Chrome 151,
`astro preview`) is not interactive at all:

```
before: Interactive count: 0      after 3 clicks: Interactive count: 0
btn before: Svelte clicks: 0      btn after: Svelte clicks: 0
```

versus the intact build, which reaches `3`/`3`. The chunk was restored
immediately (`584122fd…` verified identical).

Impact: `vp run verify` and CI (`.github/workflows/ci.yml:21`) can report green
on a release candidate whose island never hydrates, which is precisely the
condition requirement 5 exists to exclude. The gate also asserts only
`byteLength > 0` (line 55) — no content assertion on the renderer — so it proves
serving, not working. Following the island's import graph (or one
`Runtime.evaluate`-free check such as asserting the counter text changes) is what
would make the claim real.

### 2. The release proof's asset table omits the largest hydration asset while claiming completeness — issue

`ephemeral/proof/svelte-shadcn-0.1.0/README.md:17` states "The page's exact
hashed assets all returned HTTP 200" above a four-row table, and line 11 says
the HTML contained "the Svelte client renderer". The renderer's own dependency
`client.BA1RN6yK.js` (39,692 B, `584122fd…`) is absent from the table, and the
`3 client assets` figure quoted at line 33 inherits finding 1's blind spot. So
the proof's digest set covers 226,588 of the 265,880 bytes the browser actually
loads, while reading as exhaustive. Impact: a future regression in the hydration
runtime chunk changes nothing that the proof or the gate would notice.

### 3. The proof's new 55/56 instantiation claim cannot be reproduced or traced — issue

`ephemeral/proof/svelte-shadcn-0.1.0/README.md:35` asserts "The independent
reviewer additionally instantiated 55 of the 56 registry items under Astro SSR."
Unlike the browser paragraph at line 39, it cites no artifact — the supporting
record is `ephemeral/reviews/202608171929-svelte-shadcn-round-12.md`, which is
committed in this very repository and goes uncited — and the fixtures behind it
lived in a scratch tree that was deleted, as that artifact states. Nothing in the
repository can re-derive the claim: `check:shadcn` now explicitly disclaims
instantiation (`scripts/verify-shadcn-registry.ts:124-128`), and the only
component rendering in CI is the seven-component demo island. Impact: the
strongest coverage sentence in the release proof is an unciteable assertion about
work no consumer can repeat; round 11 already required reviewer-sourced claims to
name their artifact.

### 4. `README.md:67` misattributes the `$app/*` requirement to `formsnap` — nitpick

The new bullet says the `form` item "is built on `formsnap` and
`sveltekit-superforms`, whose runtime requires SvelteKit's `$app/*` modules."
`grep -rl '[$]app/'` over `formsnap@2.0.1/dist` returns nothing; the `$app/*`
imports are entirely in `sveltekit-superforms/dist/client/{form,flash,superForm,
proxies}.js` and `client/SuperDebug*.svelte`. The practical conclusion (the item
cannot be instantiated, because `Form.Field` needs a `SuperForm`) is correct, but
the attribution will mislead anyone trying to salvage the component.

### 5. Round-12's three nitpicks are unchanged — nitpick

`f8f6a02` touched only documentation and one log string, so: the unattributed
`throw multilineRuneError` at `scripts/verify-shadcn-registry.ts:81-82` still
surfaces a RolldownError naming a temp path that the `finally` at line 130 has
deleted; the removal `NOTICE` at lines 84-88 still has no reader in
`.github/workflows/ci.yml:20-21`; and `README.md:66` still blames "rsvelte
0.5.2" for a parse bug that lives in the transitive
`@rsvelte/vite-plugin-svelte-native@^0.3.7`, which `pnpm-workspace.yaml:7-15`
does not list in `minimumReleaseAgeExclude`.

## Outcome

material findings remain
