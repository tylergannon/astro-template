import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { svelte } from "@rsvelte/vite-plugin-svelte";
import { build } from "vite";

const uiRoot = resolve("src/lib/components/ui");
const componentNames = (await readdir(uiRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const verificationRoot = resolve(".astro");
await mkdir(verificationRoot, { recursive: true });
const workspace = await mkdtemp(join(verificationRoot, "shadcn-"));
const entry = join(workspace, "registry.ts");

async function compileProbe(name: string, source: string): Promise<unknown> {
  const probe = join(workspace, `${name}.svelte.js`);
  await writeFile(probe, source);

  try {
    await build({
      configFile: false,
      logLevel: "silent",
      plugins: [svelte({ configFile: resolve("svelte.config.js") })],
      build: {
        ssr: probe,
        write: false,
      },
    });
  } catch (error) {
    return error;
  }
}

try {
  const multilineRuneError = await compileProbe(
    "multiline-rune-field",
    `export class Probe {
  #rune = $state(0);
  #value = true
    ? 1
    : 2;
}
`,
  );
  const singlelineRuneError = await compileProbe(
    "singleline-rune-field",
    `export class Probe {
  #rune = $state(0);
  #value = true ? 1 : 2;
}
`,
  );
  const multilinePlainError = await compileProbe(
    "multiline-plain-field",
    `export class Probe {
  #plain = 0;
  #value = true
    ? 1
    : 2;
}
`,
  );

  if (singlelineRuneError) {
    throw singlelineRuneError;
  }
  if (multilinePlainError) {
    throw multilinePlainError;
  }

  const knownIssueStillPresent =
    multilineRuneError instanceof Error && multilineRuneError.message.includes("Unexpected token");
  if (multilineRuneError && !knownIssueStillPresent) {
    throw multilineRuneError;
  }
  if (!knownIssueStillPresent) {
    console.warn(
      "NOTICE: rsvelte now accepts multiline class-field initializers; remove the mode-watcher patch and known-limitation probe.",
    );
  }

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

  const limitationStatus = knownIssueStillPresent
    ? "Confirmed the documented rsvelte limitation. "
    : "";
  console.log(
    `${limitationStatus}Bundled all ${componentNames.length} shadcn-svelte registry components for client and SSR.`,
  );
} finally {
  await rm(workspace, { recursive: true, force: true });
}
