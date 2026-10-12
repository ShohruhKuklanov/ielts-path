#!/bin/bash
# Gives an account admin rights in the local database.
# First sign in once at http://localhost:3001 with that email, then run this.
cd "$(dirname "$0")"
echo "Admin bo'ladigan email manzilni yozing / email to make admin:"
read -r email
email=$(printf '%s' "$email" | tr -d '[:space:]' | sed "s/'/''/g")
[ -n "$email" ] || { echo "Email kiritilmadi."; exit 1; }
docker exec supabase_db_ielts-app psql -tA -U postgres -d postgres -c "select public.grant_staff('$email', 'admin');" \
  || echo "Baza ishlamayapti: avval Docker Desktop va setup.command ni ishga tushiring."
echo
echo "Endi admin panel sahifasini yangilang (Cmd+R)."
