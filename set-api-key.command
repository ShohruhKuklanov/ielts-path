#!/bin/bash
# Saves your Anthropic API key for the content generator (Edge Functions) and restarts the
# local database so it picks the key up. The key is stored only in supabase/.env on this Mac
# (git ignores that file) and is never shown on screen.
cd "$(dirname "$0")"
export PATH="$HOME/.ielts-tools/node/bin:$HOME/.ielts-tools/pnpm/bin:$PATH"
[ -f supabase/.env ] || cp supabase/.env.example supabase/.env

echo "Anthropic API kalitini joylashtiring (Cmd+V) va Enter bosing. Kalit ekranda ko'rinmaydi."
echo "Paste your Anthropic API key (Cmd+V) and press Enter. It will not be shown."
read -rs key
echo
key=$(printf '%s' "$key" | tr -d '[:space:]')
case "$key" in
  sk-ant-api*) ;;
  *) echo "Bu API kalit emas. U console.anthropic.com → API Keys sahifasidan olinadi va sk-ant-api bilan boshlanadi."
     echo "This is not an API key. Create one at console.anthropic.com → API Keys (it starts with sk-ant-api)."
     echo "Hech narsa saqlanmadi / nothing was saved."; exit 1 ;;
esac

grep -v '^ANTHROPIC_API_KEY=' supabase/.env > supabase/.env.tmp || true
{ printf 'ANTHROPIC_API_KEY=%s\n' "$key"; cat supabase/.env.tmp; } > supabase/.env
rm -f supabase/.env.tmp
chmod 600 supabase/.env
echo "✔ Kalit saqlandi / key saved (…${key: -4})"

echo "Bazani qayta ishga tushirish / restarting the local database…"
pnpm exec supabase stop >/dev/null 2>&1 || true
pnpm db:start >/dev/null && echo "✔ Tayyor / done. Admin panelda 'Write with AI' ni bosing."
