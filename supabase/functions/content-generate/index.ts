// POST /functions/v1/content-generate   { "lessonId": 12 }
// Staff only. Writes a planned (draft) lesson with Claude, validates every
// exercise with the shared schemas, and saves it as "in_review" so a person
// must approve it before learners see it.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { claudeJson, type ClaudeMessage } from '../_shared/anthropic.ts';
import { corsHeaders, HttpError, json } from '../_shared/http.ts';
import { exerciseContentSchema, lessonFileSchema, type LessonFile } from '../_shared/ielts/index.ts';
import { briefMessage, OUTPUT_SCHEMA, PROMPT_VERSION, SYSTEM_PROMPT, type LessonBrief } from './prompt.ts';

interface DraftOutput {
  estMinutes: number;
  intro: unknown[];
  exercises: { skill: string; cefr: string; explanation: string; questionTypeTag?: string; content_json: string }[];
}

const MIN_EXERCISES = 3;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  let db: SupabaseClient | null = null;
  let jobId: string | null = null;
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
    const auth = req.headers.get('Authorization');
    if (!auth) throw new HttpError(401, 'Sign in first');

    // Act as the signed-in staff member: row-level security still applies.
    db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const { data: isStaff, error: staffErr } = await db.rpc('is_staff');
    if (staffErr) throw new HttpError(401, staffErr.message);
    if (!isStaff) throw new HttpError(403, 'Only admins and editors can generate content');

    const { lessonId } = (await req.json().catch(() => ({}))) as { lessonId?: number };
    if (!Number.isInteger(lessonId)) throw new HttpError(400, 'lessonId (number) is required');

    const brief = await loadBrief(db, lessonId!);
    const styleExample = await loadStyleExample(db, lessonId!);
    const { data: userData } = await db.auth.getUser();

    const { data: job, error: jobErr } = await db
      .from('content_jobs')
      .insert({ requested_by: userData.user?.id, kind: 'lesson', params: { lessonId, promptVersion: PROMPT_VERSION }, status: 'running' })
      .select('id')
      .single();
    if (jobErr) throw new HttpError(500, jobErr.message);
    jobId = job.id;

    // 1st attempt, then one repair attempt that shows Claude its own errors.
    const messages: ClaudeMessage[] = [{ role: 'user', content: briefMessage(brief, styleExample) }];
    let result = await claudeJson({ system: SYSTEM_PROMPT, messages, schema: OUTPUT_SCHEMA });
    let checked = check(JSON.parse(result.text), brief);
    const usage = [result.usage];
    if (checked.errors.length > 0) {
      messages.push({ role: 'assistant', content: result.text });
      messages.push({
        role: 'user',
        content: `Some parts are invalid. Fix ONLY these problems and return the whole lesson again:\n${checked.errors.join('\n')}`,
      });
      result = await claudeJson({ system: SYSTEM_PROMPT, messages, schema: OUTPUT_SCHEMA });
      usage.push(result.usage);
      checked = check(JSON.parse(result.text), brief);
    }

    const lesson = checked.lesson;
    if (!lesson) throw new HttpError(422, `The draft is still invalid after a retry:\n${checked.errors.join('\n')}`);

    await saveDraft(db, lessonId!, lesson);
    const output = { model: result.model, promptVersion: PROMPT_VERSION, usage, dropped: checked.errors, exercises: lesson.exercises.length };
    await db.from('content_jobs').update({ status: 'done', output }).eq('id', jobId);
    return json({ ok: true, lessonId, ...output });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    const message = e instanceof Error ? e.message : String(e);
    if (db && jobId) await db.from('content_jobs').update({ status: 'failed', error: message }).eq('id', jobId);
    return json({ ok: false, error: message }, status);
  }
});

async function loadBrief(db: SupabaseClient, lessonId: number): Promise<LessonBrief & { status: string }> {
  const { data, error } = await db
    .from('lessons')
    .select('title, kind, cefr, goals, target_language, status, review_notes, modules(title, stages(code, title))')
    .eq('id', lessonId)
    .single();
  if (error || !data) throw new HttpError(404, `Lesson ${lessonId} not found`);
  if (data.status !== 'draft') throw new HttpError(409, `Lesson is "${data.status}". Only draft lessons can be generated.`);
  // deno-lint-ignore no-explicit-any
  const mod = data.modules as any;
  return {
    status: data.status,
    stage: mod?.stages?.title ?? '',
    module: mod?.title ?? '',
    title: data.title,
    kind: data.kind,
    cefr: data.cefr ?? 'A0',
    goals: data.goals ?? [],
    targetLanguage: data.target_language ?? [],
    reviewerNotes: data.review_notes,
  };
}

/** An approved (or written-and-waiting) lesson from the course, as a compact style reference. */
async function loadStyleExample(db: SupabaseClient, excludeId: number): Promise<string> {
  const { data } = await db
    .from('lessons')
    .select('id, title, intro, exercises(type, payload, answer, explanation, order_index)')
    .in('status', ['published', 'in_review'])
    .eq('source', 'human')
    .neq('id', excludeId)
    .order('status', { ascending: false })
    .limit(1);
  const l = data?.[0];
  if (!l) return '(none yet)';
  // deno-lint-ignore no-explicit-any
  const exercises = ((l.exercises as any[]) ?? []).sort((a, b) => a.order_index - b.order_index).slice(0, 6);
  return JSON.stringify({ title: l.title, intro: l.intro, exercises: exercises.map(({ order_index: _o, ...rest }) => rest) });
}

/** Parses Claude's output into a LessonFile, dropping exercises that fail validation. */
function check(raw: DraftOutput, brief: LessonBrief): { lesson: LessonFile | null; errors: string[] } {
  const errors: string[] = [];
  const exercises: LessonFile['exercises'] = [];
  raw.exercises.forEach((ex, i) => {
    let content: unknown;
    try {
      content = JSON.parse(ex.content_json);
    } catch {
      errors.push(`Exercise ${i + 1}: content_json is not valid JSON`);
      return;
    }
    const parsed = exerciseContentSchema.safeParse(content);
    if (!parsed.success) {
      errors.push(`Exercise ${i + 1}: ${parsed.error.issues.map((x) => `${x.path.join('.')} ${x.message}`).join('; ')}`);
      return;
    }
    if (parsed.data.type === 'listen_pick' || parsed.data.type === 'dictation' || parsed.data.type === 'form_completion') {
      errors.push(`Exercise ${i + 1}: ${parsed.data.type} needs recorded audio; use another type`);
      return;
    }
    exercises.push({
      skill: ex.skill as LessonFile['exercises'][number]['skill'],
      cefr: ex.cefr as LessonFile['cefr'],
      explanation: ex.explanation,
      ...(ex.questionTypeTag ? { questionTypeTag: ex.questionTypeTag } : {}),
      content: parsed.data,
    });
  });

  const candidate = {
    title: brief.title,
    kind: brief.kind,
    cefr: brief.cefr,
    estMinutes: Math.min(30, Math.max(1, Math.round(raw.estMinutes))),
    intro: raw.intro,
    exercises,
  };
  const full = lessonFileSchema.safeParse(candidate);
  if (!full.success) {
    errors.push(...full.error.issues.filter((x) => x.path[0] !== 'exercises').map((x) => `${x.path.join('.')}: ${x.message}`));
    if (exercises.length < MIN_EXERCISES) errors.push(`Only ${exercises.length} valid exercises; at least ${MIN_EXERCISES} are needed`);
    return { lesson: null, errors };
  }
  return { lesson: full.data, errors };
}

async function saveDraft(db: SupabaseClient, lessonId: number, lesson: LessonFile) {
  // A lesson sent back for changes keeps its old exercises until a new draft replaces them.
  const del = await db.from('exercises').delete().eq('lesson_id', lessonId);
  if (del.error) throw new HttpError(500, del.error.message);

  const rows = lesson.exercises.map((ex, i) => ({
    lesson_id: lessonId,
    order_index: i + 1,
    type: ex.content.type,
    skill: ex.skill,
    cefr: ex.cefr,
    question_type_tag: ex.questionTypeTag ?? null,
    payload: ex.content.payload,
    answer: ex.content.answer,
    explanation: ex.explanation ?? null,
    status: 'in_review',
    source: 'ai',
  }));
  const ins = await db.from('exercises').insert(rows);
  if (ins.error) throw new HttpError(500, ins.error.message);

  const upd = await db
    .from('lessons')
    .update({ intro: lesson.intro, est_minutes: lesson.estMinutes, status: 'in_review', source: 'ai', review_notes: null })
    .eq('id', lessonId);
  if (upd.error) throw new HttpError(500, upd.error.message);
}
