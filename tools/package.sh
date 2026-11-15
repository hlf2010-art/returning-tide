#!/bin/bash
# Build a playable package: OUT=<dir> tools/package.sh  ->  <dir>/ReturningTide.zip
set -e
cd "$(dirname "$0")/.."
OUT=${OUT:-.}
npx vite build >/dev/null
STAGE=$(mktemp -d)/ReturningTide
mkdir -p "$STAGE"
cp -R dist "$STAGE/game"
cp package/serve.py package/serve.mjs "package/Start (Mac).command" "package/Start (Windows).bat" package/README-RUN.md "$STAGE/"
git archive --format=tar --prefix=source/ HEAD | tar -x -C "$STAGE"
(cd "$(dirname "$STAGE")" && rm -f "$OUT/ReturningTide.zip" && zip -qr -X "$OUT/ReturningTide.zip" ReturningTide)
ls -la "$OUT/ReturningTide.zip"
