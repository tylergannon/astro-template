import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { svelte } from "@rsvelte/vite-plugin-svelte";
import { build } from "vite";

const uiRoot = resolve("src/lib/components/ui");
const packageManifest = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const runtimeDependencies = Object.keys(packageManifest.dependencies);
const componentNames = (await readdir(uiRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const workspace = await mkdtemp(join(tmpdir(), "astro-template-shadcn-"));
const entry = join(workspace, "registry.ts");

try {
  await writeFile(
    entry,
    componentNames
      .map((name) => `import ${JSON.stringify(join(uiRoot, name, "index.ts"))};`)
      .join("\n"),
  );

  for (const target of ["client", "ssr"]) {
    await build({
      configFile: false,
      logLevel: "warn",
      plugins: [svelte({ configFile: resolve("svelte.config.js") })],
      resolve: {
        alias: {
          $lib: resolve("src/lib"),
        },
      },
      build:
        target === "ssr"
          ? {
              rollupOptions: {
                external: runtimeDependencies,
              },
              ssr: entry,
              write: false,
            }
          : {
              lib: {
                entry,
                formats: ["es"],
              },
              write: false,
            },
    });
  }

  console.log(
    `Bundled all ${componentNames.length} shadcn-svelte registry components for client and SSR.`,
  );
} finally {
  await rm(workspace, { recursive: true, force: true });
}
