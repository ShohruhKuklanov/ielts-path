#!/bin/bash
# Copies the IELTS PATH database (tables, security rules, Foundation lessons) to your
# Supabase cloud project. Safe to run again: lessons are updated in place.
# You need: the project's Reference ID (Supabase → Project Settings → General) and the
# database password you chose when creating the project. The password is not shown or saved.
cd "$(dirname "$0")"
export PATH="$HOME/.ielts-tools/node/bin:$HOME/.ielts-tools/pnpm/bin:$PATH"

echo "Supabase Reference ID ni yozing (Project Settings → General) va Enter bosing:"
echo "Type the Supabase Reference ID (Project Settings → General) and press Enter:"
read -r ref
ref=$(printf '%s' "$ref" | tr -d '[:space:]')
case "$ref" in
  [a-z0-9]*) ;;
  *) echo "Reference ID noto'g'ri / invalid Reference ID"; exit 1 ;;
esac

echo "Baza parolini kiriting (ekranda ko'rinmaydi) va Enter bosing:"
echo "Type the database password (hidden) and press Enter:"
read -rs pw
echo

pnpm sync:shared >/dev/null
echo "1/3 Loyihaga ulanish / linking project…"
pnpm exec supabase link --project-ref "$ref" --password "$pw" || { echo "✖ Ulanmadi. Reference ID yoki parolni tekshiring."; exit 1; }
echo "2/3 Jadval va darslarni yuklash / pushing schema and lessons…"
pnpm exec supabase db push --include-seed --password "$pw" --yes || { echo "✖ Yuklanmadi / push failed"; exit 1; }
echo "3/3 Kirish (email kod) sozlamalari / pushing auth settings…"
pnpm exec supabase config push --project-ref "$ref" --yes || echo "! Auth sozlamalari yuklanmadi: Supabase'da Authentication → Emails → Magic link shablonini qo'lda o'zgartiring."
echo "✔ Tayyor / done."
