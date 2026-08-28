# syntax=docker/dockerfile:1.7

# Multi-stage build for a Next.js app inside a pnpm workspace.
#
# The app is built with output: "standalone" and outputFileTracingRoot set to
# the monorepo root, so the traced bundle lands as:
#   .next/standalone/node_modules/      <- traced dependencies
#   .next/standalone/apps/web/server.js <- entrypoint
# The runner stage therefore copies the standalone tree to /app and starts
# apps/web/server.js. Only production files reach the final image.

ARG NODE_VERSION=24-alpine
ARG PNPM_VERSION=10.14.0

# ---------------------------------------------------------------- base
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /repo

# ---------------------------------------------------------------- deps
# Manifests only, so this layer is cached until a dependency actually changes.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/data-table/package.json ./packages/data-table/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------- builder
FROM base AS builder
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /repo/packages/data-table/node_modules ./packages/data-table/node_modules
COPY . .

# The app imports the package through its exports map, so the package must be
# built first. This is the packaging cost recorded in ADR-008.
RUN pnpm --filter @moderation/data-table build
RUN pnpm --filter @moderation/web build

# ---------------------------------------------------------------- runner
FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

# Never run the server as root.
# -G assigns the primary group; without it adduser -S lands the user in
# "nogroup", and the --chown below would target a group it is not a member of.
RUN addgroup -g 1001 -S nodejs && adduser -S -D -H -u 1001 -G nodejs nextjs

# The standalone tree already contains only the traced production deps.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
# Static assets are not traced into standalone and must be copied explicitly.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

# Render's free instances spin down when idle; this lets the platform see the
# container come back up rather than guessing from the port alone.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
