// Validates every file under content/ against the shared schemas,
// so a broken lesson or syllabus never reaches the database.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { lessonFileSchema, syllabusSchema } from './schemas.ts';

const CONTENT = fileURLToPath(new URL('../../../../content', import.meta.url));
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as unknown;
const issues = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  r.success ? '' : r.error!.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');

describe('content files', () => {
  for (const stage of readdirSync(CONTENT, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const dir = join(CONTENT, stage.name);

    it(`${stage.name}/syllabus.json is valid`, () => {
      const r = syllabusSchema.safeParse(readJson(join(dir, 'syllabus.json')));
      assert.ok(r.success, issues(r));
      const titles = r.data!.modules.flatMap((m) => m.lessons.map((l) => l.title));
      assert.equal(new Set(titles).size, titles.length, 'lesson titles must be unique');
    });

    const lessonsDir = join(dir, 'lessons');
    let files: string[] = [];
    try {
      files = readdirSync(lessonsDir).filter((f) => f.endsWith('.json'));
    } catch {}
    for (const f of files)
      it(`${stage.name}/lessons/${f} is valid`, () => {
        const r = lessonFileSchema.safeParse(readJson(join(lessonsDir, f)));
        assert.ok(r.success, issues(r));
      });
  }
});
