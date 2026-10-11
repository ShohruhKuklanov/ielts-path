import type { Cefr } from '../types/domain.ts';

export type StageCode =
  | 'foundation'
  | 'elementary'
  | 'pre_intermediate'
  | 'intermediate'
  | 'upper_intermediate'
  | 'advanced'
  | 'mastery';

export interface StageInfo {
  code: StageCode;
  order: number;
  title: string;
  cefrFrom: Cefr;
  cefrTo: Cefr;
  /** Estimated IELTS band range at the end of the stage; null for Foundation. */
  bandFrom: number | null;
  bandTo: number | null;
  isFree: boolean;
}

/** The seven-stage path. Must match the seed rows in the initial migration. */
export const STAGES: readonly StageInfo[] = [
  { code: 'foundation', order: 1, title: 'Foundation', cefrFrom: 'A0', cefrTo: 'A1', bandFrom: null, bandTo: null, isFree: true },
  { code: 'elementary', order: 2, title: 'Elementary', cefrFrom: 'A2', cefrTo: 'A2', bandFrom: 3.0, bandTo: 4.0, isFree: false },
  { code: 'pre_intermediate', order: 3, title: 'Pre-Intermediate', cefrFrom: 'B1', cefrTo: 'B1', bandFrom: 4.5, bandTo: 5.0, isFree: false },
  { code: 'intermediate', order: 4, title: 'Intermediate', cefrFrom: 'B1+', cefrTo: 'B2', bandFrom: 5.5, bandTo: 6.0, isFree: false },
  { code: 'upper_intermediate', order: 5, title: 'Upper-Intermediate', cefrFrom: 'B2+', cefrTo: 'B2+', bandFrom: 6.5, bandTo: 7.0, isFree: false },
  { code: 'advanced', order: 6, title: 'Advanced', cefrFrom: 'C1', cefrTo: 'C1', bandFrom: 7.5, bandTo: 8.0, isFree: false },
  { code: 'mastery', order: 7, title: 'Mastery', cefrFrom: 'C2', cefrTo: 'C2', bandFrom: 8.5, bandTo: 9.0, isFree: false },
];
