import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    singleQuote: false,
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  staged: {
    "*.{astro,css,js,json,md,mjs,ts,yaml,yml}": "vp check --fix",
  },
});
