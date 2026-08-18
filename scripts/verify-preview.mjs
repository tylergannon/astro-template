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

  const assetPaths = [
    ...html.matchAll(/(?:component-url|renderer-url|href)="(\/_astro\/[^"]+\.(?:css|js))"/g),
  ].map((match) => match[1]);
  assert.equal(new Set(assetPaths).size, 3, "Expected component, renderer, and CSS assets");

  for (const assetPath of new Set(assetPaths)) {
    const assetResponse = await fetch(new URL(assetPath, origin));
    assert.equal(assetResponse.status, 200, `${assetPath} did not return HTTP 200`);
    assert.ok((await assetResponse.arrayBuffer()).byteLength > 0, `${assetPath} was empty`);
  }

  console.log("Compiled preview served the Svelte island and all three client assets.");
} finally {
  await server.stop();
}
