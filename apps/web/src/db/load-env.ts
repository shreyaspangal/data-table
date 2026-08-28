import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

/**
 * Loads `.env.local` from the app directory or the monorepo root, whichever
 * exists. Scripts here run with different working directories -- drizzle-kit
 * from `apps/web`, CI from the repo root -- and Node's `loadEnvFile` resolves
 * relative to cwd, so a single hardcoded path silently loads nothing.
 *
 * No-ops when the file is absent: CI and Docker supply DATABASE_URL directly.
 */
export function loadLocalEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(here, "../../.env.local"), // apps/web/.env.local
    resolve(here, "../../../../.env.local"), // monorepo root
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      loadEnvFile(candidate);
      return;
    }
  }
}

/** Same lookup, for CommonJS-ish callers that only have a directory. */
export function envCandidatesFrom(dir: string): string[] {
  return [join(dir, ".env.local"), join(dir, "../../.env.local")];
}
