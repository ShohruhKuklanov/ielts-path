// SM-2 spaced repetition (Wozniak, 1990), with the four buttons learners
// know from flashcard apps mapped onto SM-2's 0–5 quality scale.

export type ReviewButton = 'again' | 'hard' | 'good' | 'easy';
export const BUTTON_QUALITY: Record<ReviewButton, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export interface CardState {
  easeFactor: number; // ≥ 1.3, starts at 2.5
  intervalDays: number; // 0 = learning / relearning
  repetitions: number; // successful reviews in a row
  lapses: number; // times forgotten after being learnt
  dueAt: Date;
}

export const MIN_EASE = 1.3;
export const START_EASE = 2.5;
/** A forgotten card comes back in the same session, after 10 minutes. */
export const RELEARN_MINUTES = 10;

export function newCard(now: Date): CardState {
  return { easeFactor: START_EASE, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: now };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const roundEase = (e: number) => Math.round(e * 100) / 100;

/**
 * Applies one review and returns the next state. Pure: same input, same output.
 * - quality < 3 (Again): repetitions restart, ease unchanged (as in the original
 *   SM-2), the card is due again in 10 minutes, and a lapse is counted if it had been learnt.
 * - quality ≥ 3: intervals go 1 day, 6 days, then previous × ease; ease is
 *   updated with the SM-2 formula and never drops below 1.3.
 */
export function review(state: CardState, quality: number, now: Date): CardState {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) throw new RangeError(`Quality must be 0–5: ${quality}`);

  if (quality < 3) {
    return {
      easeFactor: state.easeFactor,
      intervalDays: 0,
      repetitions: 0,
      lapses: state.repetitions > 0 ? state.lapses + 1 : state.lapses,
      dueAt: new Date(now.getTime() + RELEARN_MINUTES * 60 * 1000),
    };
  }

  const easeFactor = Math.max(
    MIN_EASE,
    roundEase(state.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))),
  );
  const repetitions = state.repetitions + 1;
  const intervalDays =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.max(1, Math.round(state.intervalDays * easeFactor));

  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses: state.lapses,
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
  };
}

export const reviewWithButton = (state: CardState, button: ReviewButton, now: Date) =>
  review(state, BUTTON_QUALITY[button], now);

/** Cards due now or earlier, soonest first. */
export function dueCards<T extends { dueAt: Date }>(cards: readonly T[], now: Date): T[] {
  return cards.filter((c) => c.dueAt.getTime() <= now.getTime()).sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}
