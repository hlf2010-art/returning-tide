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
# the big binary assets are already in game/: don't ship them twice (source/ gets a script to copy them back)
for d in people voice models textures; do rm -rf "$STAGE/source/public/$d"; done
cat > "$STAGE/source/restore-assets.sh" <<'SH'
#!/bin/sh
# copy the people, voices, models and textures from ../game back into public/ (they ship once, in game/)
cd "$(dirname "$0")" && for d in people voice models textures; do cp -R "../game/$d" public/; done && echo "assets restored into public/"
SH
chmod +x "$STAGE/source/restore-assets.sh"
(cd "$(dirname "$STAGE")" && rm -f "$OUT/ReturningTide.zip" && zip -qr -X "$OUT/ReturningTide.zip" ReturningTide)
ls -la "$OUT/ReturningTide.zip"
