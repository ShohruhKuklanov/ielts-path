// Edge Functions run in Deno and can only see files inside supabase/functions/.
// This copies packages/shared/src (without tests) to supabase/functions/_shared/ielts/
// so the server validates and grades with exactly the same code as the app.
// Runs automatically before `pnpm db:start`; run `pnpm sync:shared` after editing shared code.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../packages/shared/src', import.meta.url));
const dest = fileURLToPath(new URL('../supabase/functions/_shared/ielts', import.meta.url));

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true, filter: (p) => !p.endsWith('.test.ts') });
writeFileSync(
  `${dest}/README.md`,
  '# Generated copy\n\nCopied from `packages/shared/src` by `scripts/sync-shared.mjs`. Do not edit here.\n',
);
console.log('✔ shared code copied to supabase/functions/_shared/ielts');
