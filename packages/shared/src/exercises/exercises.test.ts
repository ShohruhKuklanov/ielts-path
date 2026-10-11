import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { countWords, normalizeAnswer } from '../text/normalize.ts';
import { gradeExercise, ResponseTypeMismatchError } from './grade.ts';
import { EXERCISE_TYPES, exerciseContentSchema, withinWordLimit, type ExerciseContent } from './schemas.ts';

const AUDIO = '7f0c2a52-1d3e-4b8a-9c1f-2a3b4c5d6e7f';
const parse = (x: unknown) => exerciseContentSchema.parse(x) as ExerciseContent;
const errors = (x: unknown) => {
  const r = exerciseContentSchema.safeParse(x);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

// One valid example per type: these double as documentation for content writers.
const EXAMPLES = {
  mcq: {
    type: 'mcq',
    payload: { prompt: 'She ___ a teacher.', options: [{ text: 'is' }, { text: 'are' }, { text: 'am' }] },
    answer: { correct: [0] },
  },
  gap_fill: {
    type: 'gap_fill',
    payload: { text: 'I {{1}} from Uzbekistan. My brother {{2}} in Tashkent.' },
    answer: { blanks: { '1': ['am', "'m"], '2': ['lives'] } },
  },
  word_order: {
    type: 'word_order',
    payload: { tokens: ['coffee', 'I', 'like', 'every', 'morning'] },
    answer: { accepted: ['I like coffee every morning.', 'Every morning I like coffee.'] },
  },
  listen_pick: {
    type: 'listen_pick',
    payload: { audioId: AUDIO, options: [{ text: 'ship' }, { text: 'sheep' }] },
    answer: { correct: 1 },
  },
  match_pairs: {
    type: 'match_pairs',
    payload: { left: ['big', 'fast', 'happy'], right: ['glad', 'large', 'quick'] },
    answer: { pairs: [1, 2, 0] },
  },
  dictation: {
    type: 'dictation',
    payload: { audioId: AUDIO },
    answer: { accepted: ['environment'] },
  },
  tfng: {
    type: 'tfng',
    payload: {
      passage: 'Bees visit flowers to collect nectar. Most bees live in colonies.',
      statements: ['Bees collect nectar.', 'All bees live alone.', 'Bees prefer red flowers.'],
    },
    answer: { answers: ['true', 'false', 'not_given'] },
  },
  ynng: {
    type: 'ynng',
    payload: { passageRef: 'passage-3', statements: ['The writer supports the plan.'] },
    answer: { answers: ['no'] },
  },
  match_headings: {
    type: 'match_headings',
    payload: { headings: ['Early history', 'Modern uses', 'Future risks'], paragraphs: ['A', 'B'] },
    answer: { headings: [0, 1] },
  },
  form_completion: {
    type: 'form_completion',
    payload: {
      fields: ['Name: Sarah {{1}}', 'Phone: {{2}}', 'Course starts: {{3}}'],
      wordLimit: { words: 2, allowNumber: true },
    },
    answer: { blanks: { '1': ['Collins'], '2': ['07792 113 456'], '3': ['3 March', 'March 3', '3rd March'] } },
  },
} as const;

describe('normalisation', () => {
  it('ignores case, spacing, curly quotes and a final full stop', () => {
    assert.equal(normalizeAnswer('  Don’t   Worry. '), "don't worry");
    assert.equal(normalizeAnswer('LONDON'), 'london');
  });
  it('counts IELTS words', () => {
    assert.equal(countWords('well-known city'), 2);
    assert.equal(countWords('  '), 0);
    assert.equal(countWords('£20 a week'), 3);
  });
  it('checks word limits', () => {
    assert.ok(withinWordLimit('3 March', { words: 1, allowNumber: true }));
    assert.ok(!withinWordLimit('the old bridge', { words: 2, allowNumber: false }));
    assert.ok(withinWordLimit('old bridge', { words: 2, allowNumber: false }));
    assert.ok(withinWordLimit('07792 113 456', { words: 1, allowNumber: true })); // one phone number
    assert.ok(!withinWordLimit('3 May and 4', { words: 2, allowNumber: true })); // two separate numbers
  });
});

describe('exercise schemas', () => {
  it('has one valid example for each of the 10 types', () => {
    assert.deepEqual(Object.keys(EXAMPLES).sort(), [...EXERCISE_TYPES].sort());
    for (const [type, ex] of Object.entries(EXAMPLES)) assert.deepEqual(errors(ex), [], type);
  });

  it('rejects an unknown type', () => {
    assert.ok(errors({ type: 'essay', payload: {}, answer: {} }).length > 0);
  });

  it('catches answer keys that do not fit the question', () => {
    assert.ok(errors({ ...EXAMPLES.mcq, answer: { correct: [5] } }).includes('Correct option index out of range'));
    assert.ok(errors({ ...EXAMPLES.mcq, answer: { correct: [0, 1] } }).length > 0); // single-answer with two keys
    assert.ok(
      errors({ ...EXAMPLES.gap_fill, answer: { blanks: { '1': ['am'] } } }).includes(
        'Answer keys must match the blanks in the text exactly',
      ),
    );
    assert.ok(errors({ ...EXAMPLES.tfng, answer: { answers: ['true'] } }).includes('One answer per statement'));
    assert.ok(errors({ ...EXAMPLES.match_pairs, answer: { pairs: [0, 0, 1] } }).length > 0);
    assert.ok(errors({ ...EXAMPLES.word_order, answer: { accepted: ['I like tea every morning.'] } }).length > 0);
    assert.ok(errors({ type: 'tfng', payload: { statements: ['x'] }, answer: { answers: ['true'] } }).length > 0); // no passage
  });

  it('catches answer keys that break their own word limit', () => {
    const bad = { ...EXAMPLES.form_completion, answer: { blanks: { ...EXAMPLES.form_completion.answer.blanks, '1': ['Sarah Jane Collins'] } } };
    assert.ok(errors(bad).some((m) => m.includes('breaks the word limit')));
  });

  it('requires a valid media id for listening items', () => {
    assert.ok(errors({ ...EXAMPLES.listen_pick, payload: { ...EXAMPLES.listen_pick.payload, audioId: 'abc' } }).length > 0);
  });
});

describe('gradeExercise', () => {
  it('mcq: single answer', () => {
    const ex = parse(EXAMPLES.mcq);
    assert.equal(gradeExercise(ex, { type: 'mcq', selected: [0] }).correct, true);
    assert.equal(gradeExercise(ex, { type: 'mcq', selected: [1] }).score, 0);
  });

  it('mcq: "choose TWO" gives a mark per correct option, cancelled by wrong picks', () => {
    const ex = parse({
      type: 'mcq',
      payload: { prompt: 'Which TWO…', multiple: true, options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }] },
      answer: { correct: [1, 3] },
    });
    assert.equal(gradeExercise(ex, { type: 'mcq', selected: [3, 1] }).score, 1);
    assert.equal(gradeExercise(ex, { type: 'mcq', selected: [1] }).score, 0.5);
    assert.equal(gradeExercise(ex, { type: 'mcq', selected: [1, 2] }).score, 0);
    assert.equal(gradeExercise(ex, { type: 'mcq', selected: [0, 1, 2, 3] }).correct, false);
  });

  it('gap_fill: accepts any listed variant, case-insensitively, with partial credit', () => {
    const ex = parse(EXAMPLES.gap_fill);
    assert.equal(gradeExercise(ex, { type: 'gap_fill', blanks: { '1': "'M", '2': 'Lives.' } }).correct, true);
    const half = gradeExercise(ex, { type: 'gap_fill', blanks: { '1': 'am', '2': 'live' } });
    assert.equal(half.score, 0.5);
    assert.deepEqual(half.items[1], { key: '2', correct: false, expected: 'lives' });
    const empty = gradeExercise(ex, { type: 'gap_fill', blanks: {} });
    assert.equal(empty.items[0]?.reason, 'missing');
  });

  it('form_completion: right words over the word limit are marked wrong', () => {
    const ex = parse(EXAMPLES.form_completion);
    const r = gradeExercise(ex, {
      type: 'form_completion',
      blanks: { '1': 'collins', '2': '07792 113 456', '3': 'on 3 March please' },
    });
    assert.equal(r.items[0]?.correct, true);
    assert.equal(r.items[2]?.reason, 'word_limit');
  });

  it('word_order: any accepted order, punctuation optional', () => {
    const ex = parse(EXAMPLES.word_order);
    // tokens: coffee(0) I(1) like(2) every(3) morning(4)
    assert.equal(gradeExercise(ex, { type: 'word_order', order: [1, 2, 0, 3, 4] }).correct, true);
    assert.equal(gradeExercise(ex, { type: 'word_order', order: [3, 4, 1, 2, 0] }).correct, true);
    assert.equal(gradeExercise(ex, { type: 'word_order', order: [0, 1, 2, 3, 4] }).correct, false);
    assert.equal(gradeExercise(ex, { type: 'word_order', order: [1, 1, 2, 3, 4] }).correct, false); // not a permutation
  });

  it('listen_pick and dictation', () => {
    assert.equal(gradeExercise(parse(EXAMPLES.listen_pick), { type: 'listen_pick', selected: 1 }).correct, true);
    assert.equal(gradeExercise(parse(EXAMPLES.dictation), { type: 'dictation', text: 'Environment' }).correct, true);
    assert.equal(gradeExercise(parse(EXAMPLES.dictation), { type: 'dictation', text: 'enviroment' }).correct, false);
  });

  it('match_pairs and match_headings give partial credit', () => {
    const pairs = gradeExercise(parse(EXAMPLES.match_pairs), { type: 'match_pairs', pairs: [1, 0, null] });
    assert.equal(pairs.score, 1 / 3);
    assert.equal(pairs.items[2]?.reason, 'missing');
    assert.equal(gradeExercise(parse(EXAMPLES.match_headings), { type: 'match_headings', headings: [0, 1] }).correct, true);
  });

  it('tfng / ynng: "not given" is its own answer', () => {
    const r = gradeExercise(parse(EXAMPLES.tfng), { type: 'tfng', answers: ['true', 'false', 'false'] });
    assert.equal(r.score, 2 / 3);
    assert.equal(r.items[2]?.expected, 'not_given');
    assert.equal(gradeExercise(parse(EXAMPLES.ynng), { type: 'ynng', answers: ['no'] }).correct, true);
  });

  it('refuses a response of the wrong type', () => {
    assert.throws(() => gradeExercise(parse(EXAMPLES.mcq), { type: 'dictation', text: 'x' }), ResponseTypeMismatchError);
  });
});
