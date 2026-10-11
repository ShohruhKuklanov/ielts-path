#!/bin/bash
# One-click setup for the IELTS app on macOS. Double-click this file in Finder.
# Installs Node.js and pnpm into ~/.ielts-tools (no admin password needed),
# installs the project's packages, starts the local database if Docker is running,
# writes apps/mobile/.env, and starts the app.
set -euo pipefail
cd "$(dirname "$0")"
exec > >(tee setup.log) 2>&1

TOOLS="$HOME/.ielts-tools"
mkdir -p "$TOOLS"
export PATH="$TOOLS/node/bin:$TOOLS/pnpm/bin:$PATH"
step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31mXATO / ERROR: %s\033[0m\n' "$1"; exit 1; }

# 1. Node.js
need_node=1
if command -v node >/dev/null 2>&1; then
  major=$(node -p 'process.versions.node.split(".")[0]')
  [ "$major" -ge 20 ] && need_node=0
fi
if [ "$need_node" = 1 ]; then
  step "Node.js 24 yuklab olinmoqda / downloading Node.js 24 (one time)"
  arch=$(uname -m); [ "$arch" = "x86_64" ] && arch=x64
  base="https://nodejs.org/dist/latest-v24.x"
  sums=$(curl -fsSL "$base/SHASUMS256.txt") || fail "nodejs.org ga ulanib bo'lmadi / cannot reach nodejs.org"
  file=$(printf '%s\n' "$sums" | awk '{print $2}' | grep "darwin-$arch.tar.gz$" | head -1)
  curl -fL --progress-bar "$base/$file" -o "$TOOLS/node.tar.gz"
  expected=$(printf '%s\n' "$sums" | awk -v f="$file" '$2==f {print $1}')
  actual=$(shasum -a 256 "$TOOLS/node.tar.gz" | awk '{print $1}')
  [ "$expected" = "$actual" ] || fail "Node.js download checksum mismatch"
  rm -rf "$TOOLS/node" && mkdir -p "$TOOLS/node"
  tar -xzf "$TOOLS/node.tar.gz" -C "$TOOLS/node" --strip-components 1
  rm -f "$TOOLS/node.tar.gz"
fi
echo "node $(node -v)"

# 2. pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  step "pnpm o'rnatilmoqda / installing pnpm"
  npm install -g --prefix "$TOOLS/pnpm" pnpm@10 --no-fund --no-audit --loglevel=error
fi
echo "pnpm $(pnpm -v)"

# Make node and pnpm available in every new Terminal window.
line='export PATH="$HOME/.ielts-tools/node/bin:$HOME/.ielts-tools/pnpm/bin:$PATH"'
grep -qsF "$line" "$HOME/.zprofile" || printf '\n# IELTS app tools\n%s\n' "$line" >> "$HOME/.zprofile"

# 3. Project packages
step "Paketlar o'rnatilmoqda / installing packages (a few minutes)"
pnpm install
step "Expo versiyalari tekshirilmoqda / aligning Expo versions"
CI=1 pnpm fix-deps

# 4. Local database (needs Docker Desktop)
if docker info >/dev/null 2>&1; then
  step "Ma'lumotlar bazasi ishga tushirilmoqda / starting the database"
  pnpm db:start
  env_out=$(pnpm exec supabase status -o env)
  key=$(printf '%s\n' "$env_out" | grep -E '^(PUBLISHABLE_KEY|ANON_KEY)=' | head -1 | cut -d= -f2- | tr -d '"')
  ip=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo 127.0.0.1)
  printf 'EXPO_PUBLIC_SUPABASE_URL=http://%s:54321\nEXPO_PUBLIC_SUPABASE_KEY=%s\n' "$ip" "$key" > apps/mobile/.env
  echo "apps/mobile/.env written (URL http://$ip:54321)"
else
  printf '\n\033[1;33m%s\033[0m\n' "Docker Desktop ishlamayapti / is not running."
  echo "Docker Desktop'ni o'rnating va oching, keyin bu faylni yana ikki marta bosing."
  echo "Install and open Docker Desktop, then double-click setup.command again."
  exit 0
fi

# 5. Start the app
step "Ilova ishga tushirilmoqda / starting the app"
echo "Telefon kamerasi bilan QR kodni skanerlang, yoki 'w' bosing (brauzerda ochish)."
pnpm dev
