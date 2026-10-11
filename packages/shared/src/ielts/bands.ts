// IELTS band arithmetic. Every score the app shows goes through these functions.
import type { Cefr } from '../types/domain.ts';

export type Band = number; // 0–9 in steps of 0.5

/** Avoids 6.749999… style float noise before rounding. */
const clean = (n: number) => Math.round(n * 1000) / 1000;

export const isValidBand = (b: number) => b >= 0 && b <= 9 && Number.isInteger(b * 2);

/**
 * Overall band from the four section bands, using the published IELTS rule:
 * an average ending in .25 rounds up to the next half band, and .75 rounds up
 * to the next whole band (6.125 → 6, 6.25 → 6.5, 6.75 → 7).
 */
export function overallBand(listening: Band, reading: Band, writing: Band, speaking: Band): Band {
  for (const b of [listening, reading, writing, speaking])
    if (!isValidBand(b)) throw new RangeError(`Invalid section band: ${b}`);
  return roundToNearestHalfIelts((listening + reading + writing + speaking) / 4);
}

/** IELTS overall-band rounding of any average. */
export function roundToNearestHalfIelts(avg: number): Band {
  const a = clean(avg);
  const whole = Math.floor(a);
  const frac = clean(a - whole);
  if (frac < 0.25) return whole;
  if (frac < 0.75) return whole + 0.5;
  return whole + 1;
}

/** Rounds down to the nearest half band (6.75 → 6.5, 6.4 → 6). */
export function roundDownToHalf(n: number): Band {
  return Math.floor(clean(n) * 2) / 2;
}

/**
 * Band for one Writing task or one Speaking test from its four criterion bands
 * (whole numbers 0–9). The mean is rounded DOWN to the nearest half band:
 * a conservative estimate, since IELTS does not publish its exact rule.
 */
export function criteriaBand(criteria: readonly [number, number, number, number]): Band {
  for (const c of criteria)
    if (!Number.isInteger(c) || c < 0 || c > 9) throw new RangeError(`Criterion band must be a whole number 0–9: ${c}`);
  return roundDownToHalf((criteria[0] + criteria[1] + criteria[2] + criteria[3]) / 4);
}

/** Writing section band: Task 2 counts twice as much as Task 1. */
export function writingSectionBand(task1: Band, task2: Band): Band {
  return roundDownToHalf((task1 + 2 * task2) / 3);
}

// ---------- raw score (out of 40) → band ----------
export type RawScoredSection = 'listening' | 'reading_academic' | 'reading_general';

/**
 * Lowest raw score (out of 40) needed for each band. Approximate: the exact
 * cut-offs vary slightly between test versions. They agree with the points
 * IELTS publishes (e.g. Listening 30/40 ≈ band 7, General Reading 34/40 ≈ band 7).
 */
const RAW_TO_BAND: Record<RawScoredSection, readonly (readonly [minRaw: number, band: Band])[]> = {
  listening: [
    [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5],
    [16, 5], [13, 4.5], [11, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1],
  ],
  reading_academic: [
    [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5],
    [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1],
  ],
  reading_general: [
    [40, 9], [39, 8.5], [37, 8], [36, 7.5], [34, 7], [32, 6.5], [30, 6], [27, 5.5],
    [23, 5], [19, 4.5], [15, 4], [12, 3.5], [9, 3], [6, 2.5], [3, 2], [1, 1],
  ],
};

/** Band for a raw score out of 40. 0 correct gives band 0. */
export function rawToBand(section: RawScoredSection, raw: number): Band {
  if (!Number.isInteger(raw) || raw < 0 || raw > 40) throw new RangeError(`Raw score must be 0–40: ${raw}`);
  for (const [min, band] of RAW_TO_BAND[section]) if (raw >= min) return band;
  return 0;
}

/**
 * Estimated band for a practice set with fewer (or more) than 40 questions:
 * the score is scaled to 40 and rounded to the nearest whole mark.
 */
export function estimateBand(section: RawScoredSection, correct: number, total: number): Band {
  if (total <= 0 || correct < 0 || correct > total) throw new RangeError(`Invalid score ${correct}/${total}`);
  return rawToBand(section, Math.round((correct / total) * 40));
}

// ---------- CEFR ----------
/**
 * CEFR level for an IELTS band, following the published IELTS–CEFR alignment
 * (C2 8.5+, C1 7–8, B2 5.5–6.5, B1 4–5). Below B1 the split is our own
 * estimate: A2 3–3.5, A1 2–2.5, A0 below 2.
 */
export function bandToCefr(band: Band): Cefr {
  if (band >= 8.5) return 'C2';
  if (band >= 7) return 'C1';
  if (band >= 5.5) return 'B2';
  if (band >= 4) return 'B1';
  if (band >= 3) return 'A2';
  if (band >= 2) return 'A1';
  return 'A0';
}
