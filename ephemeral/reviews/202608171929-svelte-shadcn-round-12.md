# Adversarial Review — Round 12

## Review target

Repository: `/Users/tyler/src/astro-template-svelte-shadcn`, branch `codex/svelte-shadcn`,
HEAD `9b9eca4` "docs: preserve the dark Sonner integration", clean working tree,
version `0.1.0`, unmerged and untagged.

Authoritative requirements (original user request, `CLAUDE.md`, `AGENTS.md`,
`README.md`, `skills/build-astro-sites/SKILL.md`):

1. Install Svelte and every installable shadcn-svelte component.
2. Update every compatible dependency.
3. Use the rsvelte toolchain everywhere it applies.
4. Use ts-go wherever possible.
5. Merge/version only if the application actually works — a compiled Astro
   preview server serving a hydrated Svelte island that uses shadcn components.

The round-12 launch prompt supplied a path and a read-only constraint only; it
narrowed no subject matter, so the full scope above was reviewed.

## Evidence inspected

- `git log --oneline -3`, `git status --porcelain` (clean at `9b9eca4`).
- `package.json`, `pnpm-workspace.yaml`, `svelte.config.js`, `astro.config.mjs`,
  `tsconfig.json`, `.github/workflows/ci.yml`, `README.md`, `AGENTS.md`.
- `scripts/verify-shadcn-registry.ts` (131 lines), `scripts/verify-preview.ts`.
- `src/styles/global.css`, `src/layouts/Layout.astro`, `src/pages/index.astro`,
  `src/components/SvelteDemo.svelte`, `src/lib/components/ui/**` (56 registry
  directories), `src/lib/hooks/is-mobile.svelte.ts`, `src/lib/utils.ts`.
- `ephemeral/proof/svelte-shadcn-0.1.0/README.md` and its asset digest table.
- Re-verified at `9b9eca4`: `vp run verify` green across all nine stages; a fresh
  `vp run build` reproduces every published digest — `dist/index.html` 9,416 B
  `27ba0ac5…`, `index.Ba1z4j3d.css` 147,769 B `6456fb3d…`,
  `SvelteDemo.B4wkXbiv.js` 75,514 B `a9df798a…`, `client.svelte.B0c_jibu.js`
  889 B `27759faa…`; CDP against `astro preview` shows a coherent dark theme,
  `Interactive count: 0 → 2`, `errors: []`; `vp outdated --compatible --long`
  empty; `pnpm peers check` clean.
- **New this round — render sweep.** In a scratch tree (`git archive HEAD` into
  `/tmp/citest12` plus a symlinked `node_modules`; the repository was never
  mutated) I built Astro pages that actually instantiate the installed
  components, not merely import them. Batch A (23 components) and batch B (32
  components, including `Sidebar.Provider`, `Chart.Container`, `Carousel`,
  `Command`, `Drawer`, `Menubar`, `NavigationMenu`, `Pagination`, `Popover`,
  `Resizable`, `Select`, `Sheet`, `Table`, `Tabs`, `ToggleGroup`,
  `Tooltip.Provider`, `Calendar`, `RangeCalendar`, `Toaster`) prerender
  successfully (`dist/render-probe-a/index.html` 24,815 B,
  `render-probe-b/index.html` 241,635 B). Batch C proves `data-table`
  (`createSvelteTable` + `FlexRender` + `@tanstack/table-core`) renders real rows
  (`render-probe-c/index.html` 2,369 B containing the row cell). Two batch-C
  failures were my fixture's fault and are **not** reported as repository
  defects: an undeclared `zod` import, and `<Field.Root>` where
  `src/lib/components/ui/field/index.ts` exports `Field`.
  Net result: 55 of 56 installed components render under SSR. The single
  exception is finding 1.

## Findings

### 1. The installed `form` component cannot be used in this template at all — critical

`src/lib/components/ui/form/**` is installed and counted as part of "the
complete installable shadcn-svelte registry" (`README.md:3`, `README.md:62`), and
`vp run check:shadcn` prints "Bundled all 56 shadcn-svelte registry components
for client and SSR" (`scripts/verify-shadcn-registry.ts:123-127`). But the
component is unusable: `Form.Field` requires a `SuperForm` object, and the only
way to obtain one is `superForm()` from `sveltekit-superforms`
(`package.json:37`), whose runtime imports SvelteKit's virtual modules. Astro
has no `$app/*`, so any page that uses the component fails the build.

Reproduction (scratch copy of HEAD, six-line component):

```svelte
<script lang="ts">
  import * as Form from "$lib/components/ui/form/index.js";
  import { superForm } from "sveltekit-superforms";
  const form = superForm({ name: "" }, { SPA: true });
</script>
<Form.Field {form} name="name"><Form.Label>Name</Form.Label></Form.Field>
```

```
[vite+]: Rolldown failed to resolve import "$app/stores" from
  ".../sveltekit-superforms/dist/client/superForm.js".
```

Importing the package root fails the same way through
`sveltekit-superforms/dist/index.js:1` → `client/SuperDebug.svelte` →
`$app/environment`.

Impact: the template ships a component, a documented completeness claim, and two
dependencies (`sveltekit-superforms`, `formsnap`) that cannot work in an
Astro-only project. A user following `README.md` hits a hard build failure with
no guidance. Requirement 5 ("the application actually works") is satisfied for
the shipped demo but the shipped registry is not. The honest fixes are to
document the limitation explicitly (as was done for Sonner at `README.md:65`) or
to drop `form` and its two dependencies — either is acceptable; silence is not.

### 2. `check:shadcn` can only prove compilation, and that is why finding 1 survived twelve rounds — issue

`scripts/verify-shadcn-registry.ts:93-121` bundles a barrel of
`import "<ui>/<name>/index.ts"` for `client` and `ssr` targets. Nothing is ever
instantiated, so the gate exercises module graphs, not components. `form`'s
barrel imports `formsnap` plus *type-only* symbols from `sveltekit-superforms`
(`src/lib/components/ui/form/form-field.svelte:8`,
`form-element-field.svelte:8`), which erase at compile time — so the barrel
bundles cleanly while every real usage fails. The success message
("Bundled all 56 … for client and SSR") reads as coverage the gate does not
have. My out-of-tree sweep, which the repository does not contain, is what
actually established the 55/56 result. Impact: the strongest verification claim
in the project systematically cannot detect unusable components.

### 3. One probe failure path still rethrows an unattributed bundler error — nitpick

`fee7f3a` wrapped control-probe failures in explanatory errors with `{ cause }`,
but `scripts/verify-shadcn-registry.ts:81-82` still does `throw
multilineRuneError` raw. That path fires when the known limitation changes shape
(a class-field parse error whose message is not `Unexpected token`), and it
surfaces a RolldownError naming a temp path under `.astro/` that the `finally`
block at line 130 has already deleted — the precise failure mode round 09
reported. Low severity: the two adjacent controls now catch the common cases.

### 4. The rsvelte limitation is attributed to the wrong package and that package is unpinned — nitpick

`README.md:66` blames "rsvelte 0.5.2". The parser that produces
`[PARSE_ERROR] Unexpected token` is the transitive
`@rsvelte/vite-plugin-svelte-native@0.3.7`, requested as `^0.3.7`, and
`pnpm-workspace.yaml:7-15` lists the lint/check binaries and
`@rsvelte/vite-plugin-svelte@0.5.2` in `minimumReleaseAgeExclude` but not the
native parser. A patch release of the parser can silently change the documented
behavior while the version named in the README stays put.

### 5. The `NOTICE` for a fixed upstream bug has no reader — nitpick

`scripts/verify-shadcn-registry.ts:84-88` prints a non-blocking
`console.warn` when rsvelte starts accepting multiline initializers, and
`README.md:66` presents that notice as the removal signal.
`.github/workflows/ci.yml:20-21` runs `vp run verify` with no annotation or
summary step, so in CI the notice is one line of green-build stdout nobody
reads. A `::warning` annotation or a grep-and-fail step would make the signal
actionable.

## Outcome

material findings remain
