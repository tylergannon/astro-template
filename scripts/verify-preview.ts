import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { preview } from "astro";

const server = await preview({
  logLevel: "silent",
  root: fileURLToPath(new URL("../", import.meta.url)),
  server: {
    host: "127.0.0.1",
    port: 0,
  },
});

try {
  const origin = `http://${server.host ?? "127.0.0.1"}:${server.port}`;
  const response = await fetch(origin);
  assert.equal(response.status, 200);

  const html = await response.text();
  for (const expected of [
    "<astro-island uid=",
    'client="load"',
    'data-testid="svelte-shadcn-demo"',
    "Svelte clicks: 0",
    "Interactive count: 0",
  ]) {
    assert.ok(html.includes(expected), `Compiled preview is missing ${expected}`);
  }

  const componentPaths = [...html.matchAll(/component-url="(\/_astro\/[^"]+\.js)"/g)].map(
    (match) => match[1],
  );
  const rendererPaths = [...html.matchAll(/renderer-url="(\/_astro\/[^"]+\.js)"/g)].map(
    (match) => match[1],
  );
  const stylesheetPaths = [...html.matchAll(/href="(\/_astro\/[^"]+\.css)"/g)].map(
    (match) => match[1],
  );
  const hasInlineApplicationStyles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].some(
    (match) => !match[1].includes("astro-island,astro-slot"),
  );
  assert.ok(componentPaths.length > 0, "Expected at least one compiled island component");
  assert.ok(rendererPaths.length > 0, "Expected a compiled Svelte renderer");
  assert.ok(
    stylesheetPaths.length > 0 || hasInlineApplicationStyles,
    "Expected external or inline application styles",
  );

  const assetPaths = new Set([...componentPaths, ...rendererPaths, ...stylesheetPaths]);
  const entrypointCount = assetPaths.size;
  const pendingAssetPaths = [...assetPaths];
  const staticImportPatterns = [
    /(?:import|export)\s*(?:[^"'()]*?\bfrom\s*)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']/g,
  ];

  for (const assetPath of pendingAssetPaths) {
    const assetResponse = await fetch(new URL(assetPath, origin));
    assert.equal(assetResponse.status, 200, `${assetPath} did not return HTTP 200`);
    const assetBytes = await assetResponse.arrayBuffer();
    assert.ok(assetBytes.byteLength > 0, `${assetPath} was empty`);

    if (assetPath.endsWith(".js")) {
      const source = new TextDecoder().decode(assetBytes);
      for (const pattern of staticImportPatterns) {
        for (const match of source.matchAll(pattern)) {
          const importedUrl = new URL(match[1], new URL(assetPath, origin));
          if (importedUrl.origin !== origin || !importedUrl.pathname.startsWith("/_astro/")) {
            continue;
          }
          if (!assetPaths.has(importedUrl.pathname)) {
            assetPaths.add(importedUrl.pathname);
            pendingAssetPaths.push(importedUrl.pathname);
          }
        }
      }
    }
  }

  assert.ok(
    assetPaths.size > entrypointCount,
    "Expected the compiled Svelte entrypoints to have a static client import graph",
  );
  console.log(
    `Compiled preview served the Svelte island and its complete ${assetPaths.size}-asset static client graph.`,
  );
} finally {
  await server.stop();
}
