export type Status = 'draft' | 'in_review' | 'published' | 'archived';

export interface LessonRow {
  id: number;
  order_index: number;
  title: string;
  kind: string;
  cefr: string | null;
  status: Status;
  source: 'human' | 'ai';
  goals: string[];
  target_language: string[];
  est_minutes: number;
  review_notes: string | null;
}

export interface ModuleRow {
  id: number;
  order_index: number;
  title: string;
  lessons: LessonRow[];
}

export interface StageRow {
  id: number;
  order_index: number;
  code: string;
  title: string;
  modules: ModuleRow[];
}

export const STATUS_LABEL: Record<Status, string> = {
  draft: 'Planned',
  in_review: 'Needs review',
  published: 'Live',
  archived: 'Rejected',
};
