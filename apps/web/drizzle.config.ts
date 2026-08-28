import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs from apps/web, but .env.local may live at the monorepo
// root. Node's loadEnvFile resolves relative to cwd, so check both.
for (const candidate of [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), "../../.env.local"),
]) {
  if (existsSync(candidate)) {
    loadEnvFile(candidate);
    break;
  }
}

// `generate` and `check` are offline and never open a connection; only
// `migrate`, `push` and `studio` need a real URL. Throwing here would break
// the CI drift check, which must run without any secret.
const url = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
