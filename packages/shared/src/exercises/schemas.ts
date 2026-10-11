// Exercise content model. Every exercise row stores `type`, `payload` (what the
// learner sees) and `answer` (the key). This file is the single source of truth
// for their shapes; the app, the Edge Functions and the admin panel all validate
// against it, so new content never needs an app release.
import { z } from 'zod/v4';

import { countWords } from '../text/normalize.ts';

export const EXERCISE_TYPES = [
  'mcq',
  'gap_fill',
  'word_order',
  'listen_pick',
  'match_pairs',
  'dictation',
  'tfng',
  'ynng',
  'match_headings',
  'form_completion',
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

// ---------- building blocks ----------
const text = (max = 2000) => z.string().trim().min(1).max(max);
const mediaId = z.uuid();

/** An answer option: words, a picture, or both (pictures help beginners). */
export const optionSchema = z
  .object({ text: text(300).optional(), imageId: mediaId.optional() })
  .refine((o) => o.text !== undefined || o.imageId !== undefined, 'An option needs text or an image');

/** Accepted spellings for one blank, e.g. ["colour", "color"]. */
const variants = z.array(text(200)).min(1).max(10);

/** IELTS-style limit such as "NO MORE THAN TWO WORDS AND/OR A NUMBER". */
export const wordLimitSchema = z.object({
  words: z.number().int().min(1).max(5),
  allowNumber: z.boolean().default(false),
});
export type WordLimit = z.infer<typeof wordLimitSchema>;

/** Blank markers look like {{1}}, {{2}} … inside a text. */
export const BLANK_MARKER = /\{\{(\w+)\}\}/g;
export const blankIdsIn = (s: string) => [...s.matchAll(BLANK_MARKER)].map((m) => m[1] as string);

const base = { instruction: text(300).optional() };

// ---------- the ten types ----------
const mcq = z.object({
  type: z.literal('mcq'),
  payload: z.object({
    ...base,
    prompt: text(),
    options: z.array(optionSchema).min(2).max(6),
    /** "Choose TWO letters" style questions. */
    multiple: z.boolean().default(false),
  }),
  answer: z.object({ correct: z.array(z.number().int().min(0)).min(1) }),
});

const gapFill = z.object({
  type: z.literal('gap_fill'),
  payload: z.object({
    ...base,
    /** Sentence or paragraph with {{1}} style blanks. */
    text: text(4000),
    wordBank: z.array(text(100)).max(20).optional(),
    wordLimit: wordLimitSchema.optional(),
  }),
  answer: z.object({ blanks: z.record(z.string(), variants) }),
});

const wordOrder = z.object({
  type: z.literal('word_order'),
  payload: z.object({
    ...base,
    /** Tokens in the (shuffled) order shown to the learner. */
    tokens: z.array(text(60)).min(2).max(20),
  }),
  /** Every acceptable sentence, written out in full. */
  answer: z.object({ accepted: z.array(text(400)).min(1).max(5) }),
});

const listenPick = z.object({
  type: z.literal('listen_pick'),
  payload: z.object({
    ...base,
    audioId: mediaId,
    prompt: text().optional(),
    options: z.array(optionSchema).min(2).max(6),
  }),
  answer: z.object({ correct: z.number().int().min(0) }),
});

const matchPairs = z.object({
  type: z.literal('match_pairs'),
  payload: z.object({
    ...base,
    left: z.array(text(200)).min(2).max(10),
    right: z.array(text(200)).min(2).max(12),
  }),
  /** right index for each left item, in order. */
  answer: z.object({ pairs: z.array(z.number().int().min(0)) }),
});

const dictation = z.object({
  type: z.literal('dictation'),
  payload: z.object({ ...base, audioId: mediaId, hint: text(200).optional() }),
  answer: z.object({ accepted: variants }),
});

const TFNG = ['true', 'false', 'not_given'] as const;
const YNNG = ['yes', 'no', 'not_given'] as const;
export type TfngValue = (typeof TFNG)[number];
export type YnngValue = (typeof YNNG)[number];

const statementsPayload = z.object({
  ...base,
  /** Reading passage the statements refer to (or a reference to a shared passage). */
  passage: text(12000).optional(),
  passageRef: z.string().max(100).optional(),
  statements: z.array(text(400)).min(1).max(15),
});

const tfng = z.object({
  type: z.literal('tfng'),
  payload: statementsPayload,
  answer: z.object({ answers: z.array(z.enum(TFNG)).min(1) }),
});

const ynng = z.object({
  type: z.literal('ynng'),
  payload: statementsPayload,
  answer: z.object({ answers: z.array(z.enum(YNNG)).min(1) }),
});

const matchHeadings = z.object({
  type: z.literal('match_headings'),
  payload: z.object({
    ...base,
    headings: z.array(text(200)).min(2).max(15),
    /** Paragraph labels ("A", "B" …) or the paragraph text itself. */
    paragraphs: z.array(text(6000)).min(1).max(10),
  }),
  /** heading index for each paragraph, in order. */
  answer: z.object({ headings: z.array(z.number().int().min(0)) }),
});

const formCompletion = z.object({
  type: z.literal('form_completion'),
  payload: z.object({
    ...base,
    title: text(200).optional(),
    /** Each field label contains exactly one {{id}} blank, e.g. "Surname: {{1}}". */
    fields: z.array(text(300)).min(1).max(15),
    wordLimit: wordLimitSchema,
  }),
  answer: z.object({ blanks: z.record(z.string(), variants) }),
});

// ---------- the union + cross-field checks ----------
export const exerciseContentSchema = z
  .discriminatedUnion('type', [
    mcq,
    gapFill,
    wordOrder,
    listenPick,
    matchPairs,
    dictation,
    tfng,
    ynng,
    matchHeadings,
    formCompletion,
  ])
  .superRefine((ex, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message, path: ['answer'] });
    switch (ex.type) {
      case 'mcq': {
        const n = ex.payload.options.length;
        if (ex.answer.correct.some((i) => i >= n)) issue('Correct option index out of range');
        if (new Set(ex.answer.correct).size !== ex.answer.correct.length) issue('Duplicate correct option');
        if (!ex.payload.multiple && ex.answer.correct.length !== 1) issue('Single-answer question needs exactly one correct option');
        if (ex.payload.multiple && ex.answer.correct.length < 2) issue('Multiple-answer question needs at least two correct options');
        break;
      }
      case 'listen_pick':
        if (ex.answer.correct >= ex.payload.options.length) issue('Correct option index out of range');
        break;
      case 'gap_fill':
      case 'form_completion': {
        const source = ex.type === 'gap_fill' ? ex.payload.text : ex.payload.fields.join('\n');
        const ids = blankIdsIn(source);
        if (ids.length === 0) issue('No {{id}} blanks found');
        if (new Set(ids).size !== ids.length) issue('Duplicate blank id');
        const keys = Object.keys(ex.answer.blanks);
        if (ids.length !== keys.length || ids.some((id) => !keys.includes(id)))
          issue('Answer keys must match the blanks in the text exactly');
        const limit = ex.payload.wordLimit;
        if (limit)
          for (const [id, vs] of Object.entries(ex.answer.blanks))
            for (const v of vs) if (!withinWordLimit(v, limit)) issue(`Answer "${v}" for blank ${id} breaks the word limit`);
        break;
      }
      case 'word_order': {
        const tokenSet = [...ex.payload.tokens].map((t) => t.toLowerCase()).sort().join(' ');
        for (const s of ex.answer.accepted) {
          const words = s.replace(/[.!?]$/, '').toLowerCase().split(/\s+/).sort().join(' ');
          if (words !== tokenSet) issue(`Accepted sentence "${s}" does not use exactly the given tokens`);
        }
        break;
      }
      case 'match_pairs':
        if (ex.answer.pairs.length !== ex.payload.left.length) issue('One pair per left item');
        if (ex.answer.pairs.some((i) => i >= ex.payload.right.length)) issue('Pair index out of range');
        if (new Set(ex.answer.pairs).size !== ex.answer.pairs.length) issue('Each right item can be used once');
        break;
      case 'tfng':
      case 'ynng':
        if (ex.answer.answers.length !== ex.payload.statements.length) issue('One answer per statement');
        if (!ex.payload.passage && !ex.payload.passageRef) issue('Needs a passage or passageRef');
        break;
      case 'match_headings':
        if (ex.answer.headings.length !== ex.payload.paragraphs.length) issue('One heading per paragraph');
        if (ex.answer.headings.some((i) => i >= ex.payload.headings.length)) issue('Heading index out of range');
        if (new Set(ex.answer.headings).size !== ex.answer.headings.length) issue('Each heading can be used once');
        break;
      case 'dictation':
        break;
    }
  });

export type ExerciseContent = z.infer<typeof exerciseContentSchema>;
export type ExerciseOf<T extends ExerciseType> = Extract<ExerciseContent, { type: T }>;

// ---------- learner responses ----------
const indexList = z.array(z.number().int().min(0));
const blankMap = z.record(z.string(), z.string().max(200));

export const exerciseResponseSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('mcq'), selected: indexList }),
  z.object({ type: z.literal('gap_fill'), blanks: blankMap }),
  z.object({ type: z.literal('word_order'), order: indexList }),
  z.object({ type: z.literal('listen_pick'), selected: z.number().int().min(0) }),
  z.object({ type: z.literal('match_pairs'), pairs: z.array(z.number().int().min(0).nullable()) }),
  z.object({ type: z.literal('dictation'), text: z.string().max(500) }),
  z.object({ type: z.literal('tfng'), answers: z.array(z.enum(TFNG).nullable()) }),
  z.object({ type: z.literal('ynng'), answers: z.array(z.enum(YNNG).nullable()) }),
  z.object({ type: z.literal('match_headings'), headings: z.array(z.number().int().min(0).nullable()) }),
  z.object({ type: z.literal('form_completion'), blanks: blankMap }),
]);
export type ExerciseResponse = z.infer<typeof exerciseResponseSchema>;

// ---------- helpers used by the schema and the grader ----------

/**
 * True when `value` fits a limit like "NO MORE THAN TWO WORDS AND/OR A NUMBER".
 * Digits split by spaces (a phone number such as "07792 113 456") count as one number.
 */
export function withinWordLimit(value: string, limit: WordLimit): boolean {
  const tokens = value.trim().split(/\s+/u).filter(Boolean);
  const isNumber = (t: string) => /^[£$€]?\d[\d.,:/-]*%?$/u.test(t);
  let numbers = 0;
  let prevWasNumber = false;
  const wordTokens: string[] = [];
  for (const t of tokens) {
    if (isNumber(t)) {
      if (!prevWasNumber) numbers += 1;
      prevWasNumber = true;
    } else {
      wordTokens.push(t);
      prevWasNumber = false;
    }
  }
  const words = countWords(wordTokens.join(' '));
  if (limit.allowNumber) return words <= limit.words && numbers <= 1;
  return words + numbers <= limit.words;
}
