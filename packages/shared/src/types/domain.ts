// Domain types shared by the app, Edge Functions and the admin panel.
// These mirror the enums in supabase/migrations/20261011000000_initial_schema.sql.

export const CEFR_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'] as const;
export type Cefr = (typeof CEFR_LEVELS)[number];

export const SKILLS = [
  'listening',
  'reading',
  'writing',
  'speaking',
  'vocabulary',
  'grammar',
  'pronunciation',
] as const;
export type Skill = (typeof SKILLS)[number];

export type IeltsModule = 'academic' | 'general';
export type Plan = 'free' | 'premium';
export type DailyGoalMinutes = 10 | 20 | 30 | 60;
export const DAILY_GOAL_OPTIONS: readonly DailyGoalMinutes[] = [10, 20, 30, 60];

/** One row of public.profiles, as the app reads it. */
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  cefr_level: Cefr | null;
  ielts_module: IeltsModule | null;
  target_band: number | null;
  exam_date: string | null; // ISO date, YYYY-MM-DD
  daily_goal_minutes: DailyGoalMinutes;
  current_stage_id: number | null;
  xp: number;
  level: number;
  streak_current: number;
  streak_best: number;
  last_active_date: string | null;
  plan: Plan;
  premium_until: string | null;
  onboarding_done: boolean;
  created_at: string;
}

/** Columns a signed-in user is allowed to change on their own profile (enforced by a column grant). */
export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'display_name'
    | 'avatar_url'
    | 'timezone'
    | 'ielts_module'
    | 'target_band'
    | 'exam_date'
    | 'daily_goal_minutes'
    | 'onboarding_done'
  >
>;
