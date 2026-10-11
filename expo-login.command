#!/bin/bash
# Double-click to sign in to Expo (needed once, so Expo Go on iPhone can open the app).
# Uses browser login: works for accounts created with Google/GitHub too, no password typing here.
cd "$(dirname "$0")/apps/mobile"
export PATH="$HOME/.ielts-tools/node/bin:$HOME/.ielts-tools/pnpm/bin:$PATH"
echo "Brauzer ochiladi. U yerda shohruh97 akkaunti bilan kiring va ruxsat bering."
echo "A browser window will open: sign in to Expo there and confirm."
echo
pnpm exec expo login --browser
echo
echo "Hozir kirilgan akkaunt / signed in as:"
pnpm exec expo whoami | tee ../../expo-login.log
echo
echo "Akkaunt nomingiz chiqqan bo'lsa: oynani yoping va setup.command ga ikki marta bosing."
