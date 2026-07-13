# Astro 7 + Vite+ template

A small, opinionated Astro 7 starter managed by [Vite+](https://viteplus.dev/). It includes Tailwind CSS 4, Lucide icons through `astro-icon`, responsive Astro images, strict TypeScript, repository-local agent guidance, and the official Astro Docs MCP server.

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

| Command              | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `vp install`         | Install the pinned pnpm toolchain and dependencies  |
| `vp run dev`         | Start Astro's Vite-powered development server       |
| `vp check`           | Format, lint, and type-check supported source files |
| `vp run check:astro` | Run Astro's `.astro` diagnostics                    |
| `vp run build`       | Create the production build in `dist/`              |
| `vp run preview`     | Preview the production build                        |

Use `vp exec astro dev --host 0.0.0.0 --background` for Astro 7's agent-friendly background server. The explicit host binding lets sandboxed browser tools reach it at `http://127.0.0.1:4321/`. Stop it with `vp exec astro dev stop`.

## Included choices

- Tailwind CSS 4 uses the preferred `@tailwindcss/vite` plugin. Theme tokens live in `src/styles/global.css`; no Tailwind config file is needed.
- `astro-icon` renders local, tree-shaken Iconify icons. The Lucide collection is installed; use `<Icon name="lucide:arrow-right" />`.
- Astro's image defaults use `layout: "constrained"` and responsive styles. Put optimizable images in `src/assets/`, import them, and render them with `astro:assets`. Use `layout="full-width"` for heroes and `priority` only above the fold.
- The official Astro Docs MCP endpoint is committed for Codex and VS Code. Other MCP clients can use `https://mcp.docs.astro.build/mcp` with Streamable HTTP.

No UI component library is installed yet. This keeps the base template framework-free and leaves that decision to the first real site.
