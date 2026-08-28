#!/usr/bin/env sh
# Serves the standalone build -- the same artifact the Docker image runs.
#
# `next start` is not compatible with output: "standalone"; it warns and only
# appears to work for fully static pages. Running the traced server here means
# e2e exercises the deployable artifact rather than a dev-mode approximation.
set -e

cd "$(dirname "$0")/.."

# Static assets are not traced into standalone and must be placed by hand.
# The Dockerfile performs the equivalent COPY.
mkdir -p .next/standalone/apps/web/.next
rm -rf .next/standalone/apps/web/.next/static
cp -r .next/static .next/standalone/apps/web/.next/static

if [ -d public ]; then
  rm -rf .next/standalone/apps/web/public
  cp -r public .next/standalone/apps/web/public
fi

exec node .next/standalone/apps/web/server.js
