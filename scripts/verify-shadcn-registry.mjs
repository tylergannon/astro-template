import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { svelte } from "@rsvelte/vite-plugin-svelte";
import { build } from "vite";

const uiRoot = resolve("src/lib/components/ui");
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

  await build({
    configFile: false,
    logLevel: "warn",
    plugins: [svelte()],
    resolve: {
      alias: {
        $lib: resolve("src/lib"),
      },
    },
    build: {
      lib: {
        entry,
        formats: ["es"],
      },
      write: false,
    },
  });

  console.log(`Bundled all ${componentNames.length} shadcn-svelte registry components.`);
} finally {
  await rm(workspace, { recursive: true, force: true });
}
