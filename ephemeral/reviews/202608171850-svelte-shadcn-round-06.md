# Adversarial review — Svelte + shadcn-svelte release candidate (round 06)

## Review target

- Branch `codex/svelte-shadcn`, clean working tree at `ed1d638` ("fix: stabilize release artifacts"); no tags, not merged into `main`, `package.json` version `0.1.0`.
- Whole body of work re-reviewed end to end: `a250b8a` → `89d7f30` → `8640016` → `1c79d42` → `3166d15` → `6c5684e` → `ed1d638`, with particular attention to the new commit (`src/styles/global.css`, `package.json`, `scripts/verify-preview.ts`, `README.md`, proof, worklog).
- Proof: `ephemeral/proof/svelte-shadcn-0.1.0/{README.md,headers.txt}`; worklog `ephemeral/worklog/202608171728-svelte-shadcn-rsvelte.md`.

Authoritative requirements: `AGENTS.md`/`CLAUDE.md` (symlinked), `skills/build-astro-sites/SKILL.md`, and the user's goals — install Svelte plus every installable shadcn-svelte component, update compatible dependencies, use rsvelte tooling everywhere it applies, use ts-go wherever possible, and merge/version only if the application actually works through a compiled Astro preview server with a Svelte island and shadcn components. The caller imposed no restriction on subject matter, so no narrowing was ignored.

## Evidence inspected and independently reproduced

Read: the full `ed1d638` diff, both `scripts/*.ts`, `package.json`, `src/styles/global.css`, `.gitignore`, `tsconfig.json`, `.github/workflows/ci.yml`, `vite.config.ts`, both lint configs, `src/pages/index.astro`, `src/components/SvelteDemo.svelte`, all 56 `src/lib/components/ui/*` index files, `src/lib/components/ui/sonner/sonner.svelte`, `node_modules/mode-watcher/dist/mode-states.svelte.js`, README, agent docs, skill, proof, worklog.

Executed:

| Check | Result |
| --- | --- |
| `vp run verify` (now composed from named scripts) | **exit 0 in 8.7 s** — `vp check`, `format:rsvelte:check` (0/424), both lint passes, `check:rsvelte` (336 files), `check:shadcn` 56/56 client+SSR, `check:astro` (73 files), `check:preview` (build + "served the Svelte island and 3 client assets") |
| **Round-05 finding 1 closed** | `@import "tailwindcss" source(none); @source "../";` scopes detection to `src/`. Adding a prose file full of class-like words to `ephemeral/reviews/` leaves the stylesheet byte-identical (`41c14065…` before and after). Selector diff vs the previous build removes exactly `.static`, `.inline`, `.contents`, `.running`, `.visible` — all prose artifacts, none used in `src/` |
| **Round-05 finding 2 closed** | all four proof digests reproduce byte-for-byte at HEAD: `index.html` 9,407 `7f0f96d4…`, `SvelteDemo.B4wkXbiv.js` 75,514 `a9df798a…`, `client.svelte.B0c_jibu.js` 889 `27759faa…`, `index.D11LqwnS.css` 148,806 `41c14065…`; `headers.txt` Etag/Content-Length agree |
| **Round-05 findings 3–5 closed** | `engines.node` is `>=22.18.0` and `README.md:7` states the floor; `verify` now composes `vp run format:rsvelte:check / lint:rsvelte / check:rsvelte / check:shadcn / check:astro / check:preview`; `verify-preview.ts:45-48` now requires external or inline application styles |
| Hydration + styling at HEAD (headless Chrome 151 over CDP against the compiled preview) | re-confirmed after the Tailwind rescoping: 3 real clicks drive `Svelte clicks: 0→3` and `Interactive count: 0→3`, card background `oklch(0.205 0 0)`, badge variant classes intact, `errors: []` |
| **Render-build sweep of the installed corpus (new this round)** | three scratch pages exercising **42 of the 56 installed components** (accordion, alert, alert-dialog, aspect-ratio, avatar, breadcrumb, button-group, calendar, carousel, chart, checkbox, collapsible, command, context-menu, data-table, dialog, drawer, dropdown-menu, empty, field, form, hover-card, input, input-group, input-otp, item, kbd, label, menubar, native-select, navigation-menu, pagination, popover, progress, radio-group, range-calendar, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, spinner, switch, table, tabs, textarea, toggle, toggle-group, tooltip) build and prerender cleanly — **except `sonner`, which breaks the build entirely** (finding 1) |
| Client-vs-SSR isolation probe | bundling `src/lib/components/ui/sonner/index.js` through `@rsvelte/vite-plugin-svelte`: **client pass OK, SSR pass fails** once bare imports are not externalized — i.e. the gate's own configuration is what hides finding 1 |

Rounds 01–05 findings are all closed, and the demo application genuinely works through the compiled preview server. This round's sweep of the *rest* of the installed corpus is what produced the findings below.

## Findings

### 1. Critical — the installed `sonner` component cannot be built or served, and the same rsvelte defect breaks ordinary first-party `.svelte.js` rune modules

Rendering an installed registry component that the release claims to ship kills both the production build and the dev server. Minimal reproduction on a clean scratch checkout of HEAD — one component, one page:

```svelte
<script lang="ts">
  import { Toaster } from "$lib/components/ui/sonner/index.js";
</script>

<Toaster />
```

```
$ astro build
[ERROR] [vite] ✗ Build failed in 180ms
[PARSE_ERROR] Unexpected token
    ╭─[ …/node_modules/mode-watcher/dist/mode-states.svelte.js:46:3 ]
 46 │        ? new MediaQuery("prefers-color-scheme: light");
$ astro dev  →  GET / returns HTTP 500 (<title>RolldownError</title>)
```

`src/lib/components/ui/sonner/sonner.svelte:2` imports `mode` from `mode-watcher`, so the component is unusable as installed. The offending file is valid JavaScript (`node --check` passes), and the failure is confined to the SSR/server pass: bundling the same entry with rsvelte succeeds for `client` and fails for `ssr`.

The defect is not specific to that dependency. Narrowed to a seven-line first-party module — a `.svelte.js` rune module containing a `$state` field followed by any field whose initializer spans multiple lines:

```js
// src/lib/probe.svelte.js
export class T {
  #a = $state(0);
  #b = true
    ? 1
    : 2;
  get a() { return this.#a; }
}
```

```
$ astro build   →  [PARSE_ERROR] Unexpected token  ╭─[ src/lib/probe.svelte.js:10:3 ]
```

Control variants isolate the trigger precisely: the same class with a **single-line** ternary builds; the multi-line ternary **without** a `$state` field builds; a `$state` field plus a plain field builds. Only the combination fails, which points at rsvelte's rune transform for `.svelte.js` modules emitting output whose offsets no longer match the source it hands to the bundler.

Impact: `.svelte.js` rune modules are the canonical Svelte 5 way to share reactive state, and this template's entire premise is that `@rsvelte/vite-plugin-svelte` can stand in for the upstream plugin (`pnpm-workspace.yaml` override; `AGENTS.md`: "Svelte compilation is redirected through `@rsvelte/vite-plugin-svelte`"). Shipping `0.1.0` means shipping a starter in which one bundled component is dead on arrival and a mainstream Svelte 5 pattern breaks the build with an error that points into `node_modules`, with nothing in the repository documenting the hazard. This must be resolved before release: pin the SSR pass to the upstream plugin, remove or patch `sonner`, or at minimum record the reproduction and the limitation in the README/worklog and file it upstream — and add it to the gate (finding 2).

### 2. Issue — the registry gate certifies "client and SSR" while structurally unable to see the failure it should have caught

`scripts/verify-shadcn-registry.ts:38-40` externalizes every bare specifier in the SSR pass:

```js
// The client pass resolves every dependency; SSR externalizes bare imports to
// focus this second pass on compiling the registry's server output.
external: (id) => !id.startsWith(".") && !isAbsolute(id) && !id.startsWith("$lib"),
```

`mode-watcher` is therefore never compiled by the check that exists to prove the corpus compiles, while Astro's real SSR build does compile it — which is exactly why `vp run verify` is green on a corpus containing an unbuildable component. I flagged this asymmetry as a nitpick in rounds 04 and 05; finding 1 shows it is load-bearing. The proof inherits the overstatement: `ephemeral/proof/svelte-shadcn-0.1.0/README.md:28` claims "The complete installable shadcn-svelte registry corpus compiles together" and line 33 that all 56 components were bundled "for client and SSR", neither of which survives contact with `astro build`.

Two changes make the gate say what the proof claims: stop externalizing Svelte-authoring dependencies in the SSR pass (mirror Astro's own `ssr.noExternal` for Svelte packages), and prerender the corpus rather than only bundling it — a generated page that mounts every installed component through `astro build` is a handful of lines and would have failed on `sonner` at the first run. My three scratch pages covered 42 of 56 components in about a minute of wall-clock, so the coverage is cheap.

### 3. Nitpick — the new inline-styles branch is untestable as written and keyed to an Astro internal string

`scripts/verify-preview.ts:40-48` accepts inline styles when some `<style>` block does not contain the literal `astro-island,astro-slot`. That literal is Astro's internal island-display shim, not a contract; if Astro reformats or renames it, every `<style>` block starts counting as application styles and the new assertion passes vacuously. The branch also never executes in this repo (the 148 KB stylesheet is always external), so it is unexercised gate code. Keying on "a `<style>` block containing a project token such as `--color-popover`" would assert the thing that matters.

### 4. Nitpick — the Node floor is documented for humans only

`package.json:66` correctly requires `>=22.18.0` and `README.md:7` states it, but the agent-facing instructions that `CLAUDE.md` says override default behavior — `AGENTS.md` and `skills/build-astro-sites/SKILL.md` — never mention Node at all, and neither does the CI setup comment. An agent or contributor who reads only those files still discovers the requirement as `ERR_UNKNOWN_FILE_EXTENSION` from `node scripts/verify-preview.ts`.

### 5. Nitpick — nothing automated still touches the application

The gate proves markup, assets, and styles are served; it never clicks. "The application actually works" continues to rest on my Chrome runs (re-confirmed above at HEAD after the Tailwind rescoping) plus the manual procedure in the proof. Likewise the proof's digest table is accurate today only because I recomputed it — no stage compares it to the build. Both close in `verify-preview.ts`, which already owns a live preview server: assert the served digests against a committed manifest, and drive one click through CDP.

## Outcome

`material findings remain`
