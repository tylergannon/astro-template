# Astro 7 + Vite+ template

A small, opinionated Astro 7 starter managed by [Vite+](https://viteplus.dev/). It includes Tailwind CSS 4, Svelte 5, the complete installable shadcn-svelte registry, the Rust-powered rsvelte toolchain, ts-go type-checking, Lucide icons, responsive Astro images, repository-local agent guidance, and the official Astro Docs MCP server.

## Create a project

Install the `vp` CLI once:

```sh
curl -fsSL https://vite.plus | bash
```

Then scaffold this repository (replace the owner if you fork it):

```sh
vp create github:tylergannon/astro-template
```

Vite+ prompts for a destination and copies the complete repository template, including dependencies, Vite+ settings, editor settings, agent skills, and MCP configuration. For automation:

```sh
vp create github:tylergannon/astro-template \
  --package-manager pnpm \
  --no-interactive \
  --approve-builds \
  -- my-site
cd my-site
vp run dev
```

Install only the reusable Astro agent skill into another repository with:

```sh
npx skills add tylergannon/astro-template
```

## Commands

| Command                 | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| `vp install`            | Install the pinned pnpm toolchain and dependencies      |
| `vp run dev`            | Start Astro's Vite-powered development server           |
| `vp check`              | Run Vite+'s native formatting and non-Svelte linting    |
| `vp run format:rsvelte` | Format Svelte and surrounding source through rsvelte    |
| `vp run lint:rsvelte`   | Lint every Svelte component with rsvelte                |
| `vp run check:rsvelte`  | Check all Svelte and TypeScript source through ts-go    |
| `vp run check:shadcn`   | Bundle every shadcn-svelte item for client and SSR      |
| `vp run check:preview`  | Build, serve, and inspect the production output         |
| `vp run check:astro`    | Run Astro's framework-aware diagnostics                 |
| `vp run verify`         | Run every check, build, and compiled-preview smoke test |
| `vp run build`          | Create the production build in `dist/`                  |
| `vp run preview`        | Preview the production build                            |

Use `vp exec astro dev --host 0.0.0.0 --background` for Astro 7's agent-friendly background server. The explicit host binding lets sandboxed browser tools reach it at `http://127.0.0.1:4321/`. Stop it with `vp exec astro dev stop`.

## Included choices

- Tailwind CSS 4 uses the preferred `@tailwindcss/vite` plugin. Theme tokens live in `src/styles/global.css`; no Tailwind config file is needed.
- Astro's official Svelte integration renders Svelte 5 components and hydrates only components with a `client:*` directive. The integration's compiler plugin is redirected to `@rsvelte/vite-plugin-svelte`.
- All 56 source-installable registry components live under `src/lib/components/ui/`. The shadcn CLI remains installed for registry updates.
- rsvelte handles Svelte compilation, formatting, linting, and project checks. `rsvelte-check --tsgo` uses the installed TypeScript native preview. The `svelte` dependency remains necessary because rsvelte replaces the compiler/tooling layer, not Svelte's browser and server runtimes.
- `astro-icon` renders local, tree-shaken Iconify icons. The Lucide collection is installed; use `<Icon name="lucide:arrow-right" />`.
- Astro's image defaults use `layout: "constrained"` and responsive styles. Put optimizable images in `src/assets/`, import them, and render them with `astro:assets`. Use `layout="full-width"` for heroes and `priority` only above the fold.
- The official Astro Docs MCP endpoint is committed for Codex and VS Code. Other MCP clients can use `https://mcp.docs.astro.build/mcp` with Streamable HTTP.
