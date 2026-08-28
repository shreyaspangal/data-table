import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Emits a self-contained server bundle so the Docker image does not need
  // node_modules copied in. See the multi-stage Dockerfile (Step 9).
  output: "standalone",
  // The monorepo root is two levels up; without this Next traces files from
  // apps/web and misses the workspace-linked package.
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};

export default nextConfig;
