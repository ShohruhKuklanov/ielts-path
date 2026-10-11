// Deterministic grading for every auto-marked exercise type.
// One function so the app (instant feedback, offline) and the server
// (stage tests, placement) always agree on what counts as correct.
import { matchesAny, normalizeAnswer } from '../text/normalize.ts';
import { withinWordLimit, type ExerciseContent, type ExerciseResponse, type WordLimit } from './schemas.ts';

export interface ItemResult {
  /** Blank id, statement number, paragraph number … */
  key: string;
  correct: boolean;
  /** First accepted answer, to show the learner after a mistake. */
  expected?: string;
  /** Why it was marked wrong when the words were right, e.g. a broken word limit. */
  reason?: 'word_limit' | 'missing';
}

export interface GradeResult {
  /** True only when every item is right. */
  correct: boolean;
  /** 0–1 share of items right (partial credit for multi-item exercises). */
  score: number;
  items: ItemResult[];
}

export class ResponseTypeMismatchError extends Error {}

const summarise = (items: ItemResult[]): GradeResult => {
  const right = items.filter((i) => i.correct).length;
  const score = items.length ? right / items.length : 0;
  return { correct: items.length > 0 && right === items.length, score, items };
};

function gradeBlanks(
  key: Record<string, string[]>,
  given: Record<string, string>,
  limit: WordLimit | undefined,
): GradeResult {
  return summarise(
    Object.entries(key).map(([id, accepted]): ItemResult => {
      const value = given[id] ?? '';
      if (!value.trim()) return { key: id, correct: false, expected: accepted[0], reason: 'missing' };
      if (limit && !withinWordLimit(value, limit))
        return { key: id, correct: false, expected: accepted[0], reason: 'word_limit' };
      const correct = matchesAny(value, accepted);
      return correct ? { key: id, correct } : { key: id, correct, expected: accepted[0] };
    }),
  );
}

function gradeSlots<T>(key: readonly T[], given: readonly (T | null | undefined)[], show: (v: T) => string): GradeResult {
  return summarise(
    key.map((expected, i): ItemResult => {
      const value = given[i];
      if (value === null || value === undefined)
        return { key: String(i + 1), correct: false, expected: show(expected), reason: 'missing' };
      const correct = value === expected;
      return correct ? { key: String(i + 1), correct } : { key: String(i + 1), correct, expected: show(expected) };
    }),
  );
}

/**
 * Grades a learner response. `exercise` must already be valid
 * (exerciseContentSchema); the response is checked against its type.
 */
export function gradeExercise(exercise: ExerciseContent, response: ExerciseResponse): GradeResult {
  if (exercise.type !== response.type)
    throw new ResponseTypeMismatchError(`Response for ${response.type} given to a ${exercise.type} exercise`);

  switch (exercise.type) {
    case 'mcq': {
      const r = response as Extract<ExerciseResponse, { type: 'mcq' }>;
      const correctSet = new Set(exercise.answer.correct);
      const picked = new Set(r.selected);
      const hits = [...picked].filter((i) => correctSet.has(i)).length;
      const wrong = picked.size - hits;
      // Each correct option is one mark (as in IELTS "choose TWO"); wrong picks cancel marks.
      const score = Math.max(0, hits - wrong) / correctSet.size;
      const correct = hits === correctSet.size && wrong === 0;
      return {
        correct,
        score,
        items: exercise.answer.correct.map((i) => ({ key: String(i), correct: picked.has(i) && wrong === 0 })),
      };
    }

    case 'listen_pick': {
      const r = response as Extract<ExerciseResponse, { type: 'listen_pick' }>;
      const correct = r.selected === exercise.answer.correct;
      return { correct, score: correct ? 1 : 0, items: [{ key: '1', correct }] };
    }

    case 'gap_fill':
    case 'form_completion': {
      const r = response as Extract<ExerciseResponse, { type: 'gap_fill' | 'form_completion' }>;
      return gradeBlanks(exercise.answer.blanks, r.blanks, exercise.payload.wordLimit);
    }

    case 'dictation': {
      const r = response as Extract<ExerciseResponse, { type: 'dictation' }>;
      const correct = matchesAny(r.text, exercise.answer.accepted);
      return {
        correct,
        score: correct ? 1 : 0,
        items: [correct ? { key: '1', correct } : { key: '1', correct, expected: exercise.answer.accepted[0] }],
      };
    }

    case 'word_order': {
      const r = response as Extract<ExerciseResponse, { type: 'word_order' }>;
      const tokens = exercise.payload.tokens;
      const isPermutation =
        r.order.length === tokens.length && new Set(r.order).size === tokens.length && r.order.every((i) => i < tokens.length);
      const built = isPermutation ? r.order.map((i) => tokens[i]).join(' ') : '';
      const strip = (s: string) => normalizeAnswer(s).replace(/[.!?]$/u, '');
      const correct = isPermutation && exercise.answer.accepted.some((a) => strip(a) === strip(built));
      return {
        correct,
        score: correct ? 1 : 0,
        items: [correct ? { key: '1', correct } : { key: '1', correct, expected: exercise.answer.accepted[0] }],
      };
    }

    case 'match_pairs': {
      const r = response as Extract<ExerciseResponse, { type: 'match_pairs' }>;
      return gradeSlots(exercise.answer.pairs, r.pairs, (i) => exercise.payload.right[i] ?? String(i));
    }

    case 'match_headings': {
      const r = response as Extract<ExerciseResponse, { type: 'match_headings' }>;
      return gradeSlots(exercise.answer.headings, r.headings, (i) => exercise.payload.headings[i] ?? String(i));
    }

    case 'tfng': {
      const r = response as Extract<ExerciseResponse, { type: 'tfng' }>;
      return gradeSlots(exercise.answer.answers, r.answers, (v) => v);
    }

    case 'ynng': {
      const r = response as Extract<ExerciseResponse, { type: 'ynng' }>;
      return gradeSlots(exercise.answer.answers, r.answers, (v) => v);
    }
  }
}
