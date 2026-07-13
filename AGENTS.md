## Development

Use Vite+ for package management and task execution. Run Astro's framework-aware commands through package scripts:

```
vp install
vp run dev -- --background
vp check
vp run check:astro
vp run build
```

Manage the background server with `vp exec astro dev stop`, `vp exec astro dev status`, and `vp exec astro dev logs`.

Use the `build-astro-sites` repo skill for Astro components, styling, images, icons, and verification. Consult the Astro Docs MCP before relying on version-sensitive framework behavior.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
