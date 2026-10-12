#!/bin/bash
# Opens the admin panel at http://localhost:3001 (the database must be running: setup.command).
cd "$(dirname "$0")"
export PATH="$HOME/.ielts-tools/node/bin:$HOME/.ielts-tools/pnpm/bin:$PATH"
(sleep 6 && open http://localhost:3001) &
pnpm admin
