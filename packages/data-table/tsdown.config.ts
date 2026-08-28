import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  format: "esm",
  platform: "browser",
  dts: true,
  clean: true,
  // The package entry is a React client component. Next.js needs the
  // directive to survive bundling, so it is re-emitted as an output banner
  // rather than relying on the source directive being preserved.
  outputOptions: {
    banner: '"use client";',
  },
});
