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

  for (const assetPath of assetPaths) {
    const assetResponse = await fetch(new URL(assetPath, origin));
    assert.equal(assetResponse.status, 200, `${assetPath} did not return HTTP 200`);
    assert.ok((await assetResponse.arrayBuffer()).byteLength > 0, `${assetPath} was empty`);
  }

  console.log(`Compiled preview served the Svelte island and ${assetPaths.size} client assets.`);
} finally {
  await server.stop();
}
