#!/usr/bin/env bash
#
# Production build for Our Little Dream (Sakura City).
#
#   bash scripts/build.sh
#
# Safe to run repeatedly on an Ubuntu VPS. It never touches .data/ (database
# and uploads) — only node_modules and dist/ are managed here.
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

BOLD=$'\033[1m'
PINK=$'\033[38;5;211m'
RED=$'\033[31m'
GREEN=$'\033[32m'
DIM=$'\033[2m'
RESET=$'\033[0m'

log()  { printf '%s[sakura]%s %s\n' "$PINK" "$RESET" "$*"; }
ok()   { printf '%s[sakura]%s %s%s%s\n' "$GREEN" "$RESET" "$BOLD" "$*" "$RESET"; }
fail() { printf '%s[sakura] ERROR:%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }
dim()  { printf '%s%s%s\n' "$DIM" "$*" "$RESET"; }

trap 'fail "Build aborted (line $LINENO). See the output above."' ERR

# ---------------------------------------------------------------- preflight
log "project root: $ROOT_DIR"

[ -f "$ROOT_DIR/package.json" ] || fail "package.json not found in $ROOT_DIR"

command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Install Node 18+ (https://nodejs.org)."
command -v npm  >/dev/null 2>&1 || fail "npm is not available in PATH."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || fail "Node $NODE_MAJOR detected — Node 18 or newer is required."
log "node $(node -v) · npm $(npm -v)"

# ------------------------------------------------------------- dependencies
if [ ! -d "$ROOT_DIR/node_modules" ] || [ ! -x "$ROOT_DIR/node_modules/.bin/vite" ]; then
  log "dependencies missing — installing…"
  if [ -f "$ROOT_DIR/package-lock.json" ]; then
    npm ci --no-audit --no-fund || fail "npm ci failed. Check network access and package-lock.json."
  else
    npm install --no-audit --no-fund || fail "npm install failed."
  fi
  ok "dependencies installed"
else
  log "dependencies present"
fi

# ------------------------------------------------------------------- build
log "building for production…"
export NODE_ENV=production
npm run build || fail "vite build failed. Scroll up for the first error."

# ---------------------------------------------------------------- verify
[ -f "$ROOT_DIR/dist/index.html" ] || fail "dist/index.html was not produced."
[ -d "$ROOT_DIR/dist/assets" ] || fail "dist/assets was not produced."

JS_COUNT="$(find "$ROOT_DIR/dist/assets" -maxdepth 1 -name '*.js' | wc -l | tr -d ' ')"
CSS_COUNT="$(find "$ROOT_DIR/dist/assets" -maxdepth 1 -name '*.css' | wc -l | tr -d ' ')"
[ "$JS_COUNT" -ge 1 ] || fail "No JavaScript bundle found in dist/assets."
[ "$CSS_COUNT" -ge 1 ] || fail "No CSS bundle found in dist/assets."

mkdir -p "$ROOT_DIR/logs"

ok "build complete"
dim   "  dist/index.html   $(du -h "$ROOT_DIR/dist/index.html" | cut -f1)"
dim   "  js bundles        $JS_COUNT"
dim   "  css bundles       $CSS_COUNT"
dim   "  total dist size   $(du -sh "$ROOT_DIR/dist" | cut -f1)"

# ------------------------------------------------------------------ hints
if [ -d "$ROOT_DIR/.data" ]; then
  dim "  user data kept    .data/ ($(du -sh "$ROOT_DIR/.data" | cut -f1))"
fi

if [ ! -f "$ROOT_DIR/.env" ]; then
  log "no .env found — copy .env.example and set ADMIN_PASSWORD / SESSION_SECRET"
fi

if ! command -v pm2 >/dev/null 2>&1; then
  dim "  pm2 not installed: npm i -g pm2"
fi

printf '\n'
ok "Next: npm run pm2:start   (pm2 start ecosystem.config.cjs --env production)"
