-- =====================================================================
-- IELTS 0→9 — initial schema
-- Tables for all three phases (MVP, v2, v3), Row Level Security,
-- the new-user trigger and the seven learning stages.
--
-- Access model
--   * Content (stages → modules → lessons → exercises, words, …) is
--     readable by signed-in users; only staff (admin / editor) can write.
--   * Exercises of paid stages are readable only by premium users.
--   * Test-only items (exercises with lesson_id IS NULL: placement and
--     stage-test items) are never readable by learners, so answers stay
--     secret; Edge Functions serve them with the service role.
--   * User data is readable only by its owner. Anything that awards XP,
--     changes level, scores or unlocks stages is written by Edge Functions
--     (service role bypasses RLS), never by the app directly.
-- =====================================================================

-- ---------- ENUMS ----------
create type public.cefr as enum ('A0','A1','A2','B1','B1+','B2','B2+','C1','C2');
create type public.skill as enum ('listening','reading','writing','speaking','vocabulary','grammar','pronunciation');
create type public.content_status as enum ('draft','in_review','published','archived');
create type public.ielts_module as enum ('academic','general');

-- =====================================================================
-- CONTENT
-- =====================================================================
create table public.stages (
  id serial primary key,
  code text unique not null,
  order_index int unique not null,
  title text not null,
  cefr_from public.cefr not null,
  cefr_to public.cefr not null,
  band_from numeric(2,1),
  band_to numeric(2,1),
  is_free boolean not null default false,
  description text
);

create table public.modules (
  id serial primary key,
  stage_id int not null references public.stages on delete cascade,
  order_index int not null,
  title text not null,
  icon text,
  unique (stage_id, order_index)
);

create table public.lessons (
  id serial primary key,
  module_id int not null references public.modules on delete cascade,
  order_index int not null,
  title text not null,
  kind text not null check (kind in ('alphabet','phonics','vocabulary','grammar','listening','reading','writing','speaking','strategy','review')),
  est_minutes int not null default 5 check (est_minutes > 0),
  intro jsonb not null default '[]',
  xp_reward int not null default 10,
  status public.content_status not null default 'draft',
  version int not null default 1,
  unique (module_id, order_index)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('audio','image')),
  storage_path text not null,
  transcript text,
  duration_ms int,
  voice text,
  alt_text text,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id int references public.lessons on delete cascade,  -- null = test-only / placement item
  order_index int,
  type text not null,
  skill public.skill not null,
  cefr public.cefr not null,
  question_type_tag text,
  payload jsonb not null,
  answer jsonb not null,
  explanation text,
  audio_id uuid references public.media_assets,
  image_id uuid references public.media_assets,
  placement_pool boolean not null default false,
  difficulty numeric(4,2),
  source text not null default 'human' check (source in ('human','ai')),
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now()
);
create index exercises_lesson_idx on public.exercises (lesson_id, order_index);
create index exercises_placement_idx on public.exercises (skill, difficulty) where placement_pool;

create table public.grammar_topics (
  id serial primary key,
  code text unique not null,
  title text not null,
  cefr public.cefr,
  lesson_id int references public.lessons on delete set null
);

create table public.error_tags (
  code text primary key,                -- e.g. ART_MISSING, SVA, TENSE_PAST
  label text not null,
  grammar_topic_id int references public.grammar_topics on delete set null
);

-- =====================================================================
-- USERS
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  cefr_level public.cefr,
  ielts_module public.ielts_module default 'academic',
  target_band numeric(2,1) check (target_band between 1 and 9 and target_band * 2 = floor(target_band * 2)),
  exam_date date,
  daily_goal_minutes int not null default 20 check (daily_goal_minutes in (10,20,30,60)),
  current_stage_id int references public.stages,
  xp int not null default 0,
  level int not null default 1,
  streak_current int not null default 0,
  streak_best int not null default 0,
  last_active_date date,
  plan text not null default 'free' check (plan in ('free','premium')),
  premium_until timestamptz,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid references public.profiles on delete cascade,
  role text not null check (role in ('admin','editor')),
  primary key (user_id, role)
);

create table public.push_tokens (
  user_id uuid not null references public.profiles on delete cascade,
  token text primary key,
  platform text check (platform in ('ios','android','web')),
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ASSESSMENT
-- =====================================================================
create table public.stage_tests (
  id serial primary key,
  stage_id int unique not null references public.stages on delete cascade,
  pass_percent int not null default 70 check (pass_percent between 1 and 100),
  time_limit_sec int
);

create table public.stage_test_items (
  test_id int references public.stage_tests on delete cascade,
  exercise_id uuid references public.exercises on delete cascade,
  order_index int not null,
  primary key (test_id, exercise_id)
);

create table public.stage_test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  test_id int not null references public.stage_tests,
  answers jsonb,
  score_percent int,
  passed boolean,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index stage_test_attempts_user_idx on public.stage_test_attempts (user_id, started_at desc);

create table public.placement_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','finished','abandoned')),
  theta jsonb not null default '{}',
  result_cefr public.cefr,
  result_bands jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index placement_sessions_user_idx on public.placement_sessions (user_id, started_at desc);

create table public.placement_responses (
  id bigserial primary key,
  session_id uuid not null references public.placement_sessions on delete cascade,
  exercise_id uuid not null references public.exercises,
  response jsonb,
  is_correct boolean,
  time_ms int,
  theta_after numeric(4,2),
  created_at timestamptz not null default now()
);
create index placement_responses_session_idx on public.placement_responses (session_id);

create table public.skill_estimates (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  skill public.skill not null,
  band numeric(2,1) not null check (band between 0 and 9),
  cefr public.cefr,
  source text not null check (source in ('placement','stage_test','writing','speaking','mock','practice')),
  source_id uuid,
  created_at timestamptz not null default now()
);
create index skill_estimates_user_idx on public.skill_estimates (user_id, skill, created_at desc);

-- =====================================================================
-- LEARNING
-- =====================================================================
create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  start_band numeric(2,1),
  target_band numeric(2,1),
  exam_date date,
  daily_minutes int not null,
  weekly_focus jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index study_plans_one_active on public.study_plans (user_id) where is_active;

create table public.plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  due_date date not null,
  order_index int not null,
  task_type text not null check (task_type in ('lesson','srs_review','writing','stage_test','placement_retake')),
  ref_id text,
  est_minutes int not null,
  status text not null default 'pending' check (status in ('pending','done','skipped')),
  completed_at timestamptz
);
create index plan_tasks_user_due_idx on public.plan_tasks (user_id, due_date);

create table public.stage_progress (
  user_id uuid references public.profiles on delete cascade,
  stage_id int references public.stages on delete cascade,
  status text not null default 'locked' check (status in ('locked','unlocked','passed')),
  unlocked_at timestamptz,
  passed_at timestamptz,
  primary key (user_id, stage_id)
);

create table public.lesson_progress (
  user_id uuid references public.profiles on delete cascade,
  lesson_id int references public.lessons on delete cascade,
  status text not null default 'started' check (status in ('started','completed')),
  best_score int check (best_score between 0 and 100),
  attempts int not null default 0,
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

create table public.exercise_attempts (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  exercise_id uuid not null references public.exercises on delete cascade,
  response jsonb,
  is_correct boolean,
  time_ms int,
  created_at timestamptz not null default now()
);
create index exercise_attempts_user_idx on public.exercise_attempts (user_id, created_at desc);
create index exercise_attempts_exercise_idx on public.exercise_attempts (exercise_id);

-- =====================================================================
-- VOCABULARY
-- =====================================================================
create table public.words (
  id serial primary key,
  lemma text not null,
  pos text not null default '',
  cefr public.cefr,
  ipa text,
  definition_simple text not null,
  definition_full text,
  examples jsonb not null default '[]',
  collocations text[] not null default '{}',
  synonyms text[] not null default '{}',
  audio_id uuid references public.media_assets,
  image_id uuid references public.media_assets,
  frequency_rank int,
  is_awl boolean not null default false,
  awl_sublist int check (awl_sublist between 1 and 10),
  unique (lemma, pos)
);
create index words_lemma_idx on public.words (lower(lemma));

create table public.word_sets (
  id serial primary key,
  title text not null,
  topic text,
  stage_id int references public.stages on delete set null,
  icon text
);

create table public.word_set_items (
  set_id int references public.word_sets on delete cascade,
  word_id int references public.words on delete cascade,
  order_index int not null,
  primary key (set_id, word_id)
);

create table public.user_words (
  user_id uuid references public.profiles on delete cascade,
  word_id int references public.words on delete cascade,
  source text check (source in ('set','tap','manual')),
  ease_factor numeric(3,2) not null default 2.50 check (ease_factor >= 1.30),
  interval_days int not null default 0,
  repetitions int not null default 0,
  lapses int not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  suspended boolean not null default false,
  primary key (user_id, word_id)
);
create index user_words_due_idx on public.user_words (user_id, due_at) where not suspended;

create table public.srs_reviews (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  word_id int not null references public.words on delete cascade,
  quality smallint not null check (quality between 0 and 5),
  prev_interval int,
  new_interval int,
  reviewed_at timestamptz not null default now()
);

-- =====================================================================
-- WRITING
-- =====================================================================
create table public.writing_tasks (
  id serial primary key,
  task_type text not null check (task_type in ('sentence_build','paragraph','task1_academic','task1_general','task2')),
  stage_id int references public.stages on delete set null,
  cefr public.cefr,
  prompt_text text not null,
  image_id uuid references public.media_assets,
  visual_data jsonb,
  min_words int,
  time_limit_min int,
  status public.content_status not null default 'draft'
);

create table public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  task_id int not null references public.writing_tasks,
  text text not null check (length(text) <= 20000),
  word_count int not null,
  time_spent_sec int,
  status text not null default 'queued' check (status in ('queued','scoring','scored','failed')),
  created_at timestamptz not null default now()
);
create index writing_submissions_user_idx on public.writing_submissions (user_id, created_at desc);

create table public.writing_assessments (
  submission_id uuid primary key references public.writing_submissions on delete cascade,
  overall_band numeric(2,1) not null,
  band_ta numeric(2,1),
  band_cc numeric(2,1),
  band_lr numeric(2,1),
  band_gra numeric(2,1),
  result jsonb not null,
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- MOTIVATION & BILLING
-- =====================================================================
create table public.daily_activity (
  user_id uuid references public.profiles on delete cascade,
  day date,
  minutes int not null default 0,
  xp int not null default 0,
  goal_met boolean not null default false,
  primary key (user_id, day)
);

create table public.xp_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  amount int not null,
  reason text not null,
  ref_id text,
  created_at timestamptz not null default now()
);
create index xp_events_user_idx on public.xp_events (user_id, created_at desc);

create table public.usage_counters (
  user_id uuid references public.profiles on delete cascade,
  period text not null,                  -- '2026-10' (month) or '2026-10-11' (day)
  feature text not null,                 -- 'writing_assess', 'daily_exercises', …
  count int not null default 0,
  primary key (user_id, period, feature)
);

create table public.subscriptions (      -- v2
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  provider text not null check (provider in ('stripe','click','payme','apple','google')),
  provider_ref text not null,
  plan text check (plan in ('monthly','yearly')),
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_ref)
);

-- =====================================================================
-- ADMIN
-- =====================================================================
create table public.content_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles on delete set null,
  kind text not null,
  params jsonb not null,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  output jsonb,
  error text,
  created_at timestamptz not null default now()
);

create table public.content_reviews (
  id bigserial primary key,
  entity_type text not null,
  entity_id text not null,
  reviewer_id uuid references public.profiles on delete set null,
  decision text not null check (decision in ('approve','request_changes','reject')),
  notes text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- HELPER FUNCTIONS (used by RLS policies)
-- =====================================================================
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.has_premium()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and plan = 'premium'
      and (premium_until is null or premium_until > now())
  );
$$;

create or replace function public.can_access_stage(p_stage_id int)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.stages where id = p_stage_id and is_free)
      or public.has_premium()
      or public.is_staff();
$$;

-- =====================================================================
-- NEW USER: create the profile and unlock the first stage
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  first_stage int;
begin
  select id into first_stage from public.stages order by order_index limit 1;

  insert into public.profiles (id, display_name, avatar_url, current_stage_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    first_stage
  );

  if first_stage is not null then
    insert into public.stage_progress (user_id, stage_id, status, unlocked_at)
    values (new.id, first_stage, 'unlocked', now());
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.stages              enable row level security;
alter table public.modules             enable row level security;
alter table public.lessons             enable row level security;
alter table public.media_assets        enable row level security;
alter table public.exercises           enable row level security;
alter table public.grammar_topics      enable row level security;
alter table public.error_tags          enable row level security;
alter table public.profiles            enable row level security;
alter table public.user_roles          enable row level security;
alter table public.push_tokens         enable row level security;
alter table public.stage_tests         enable row level security;
alter table public.stage_test_items    enable row level security;
alter table public.stage_test_attempts enable row level security;
alter table public.placement_sessions  enable row level security;
alter table public.placement_responses enable row level security;
alter table public.skill_estimates     enable row level security;
alter table public.study_plans         enable row level security;
alter table public.plan_tasks          enable row level security;
alter table public.stage_progress      enable row level security;
alter table public.lesson_progress     enable row level security;
alter table public.exercise_attempts   enable row level security;
alter table public.words               enable row level security;
alter table public.word_sets           enable row level security;
alter table public.word_set_items      enable row level security;
alter table public.user_words          enable row level security;
alter table public.srs_reviews         enable row level security;
alter table public.writing_tasks       enable row level security;
alter table public.writing_submissions enable row level security;
alter table public.writing_assessments enable row level security;
alter table public.daily_activity      enable row level security;
alter table public.xp_events           enable row level security;
alter table public.usage_counters      enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.content_jobs        enable row level security;
alter table public.content_reviews     enable row level security;

-- ---------- Content: read for signed-in users, write for staff ----------
create policy "stages: read" on public.stages for select to authenticated using (true);
create policy "modules: read" on public.modules for select to authenticated using (true);
create policy "lessons: read published" on public.lessons for select to authenticated
  using (status = 'published' or (select public.is_staff()));
create policy "media: read" on public.media_assets for select to authenticated using (true);
create policy "grammar_topics: read" on public.grammar_topics for select to authenticated using (true);
create policy "error_tags: read" on public.error_tags for select to authenticated using (true);
create policy "stage_tests: read" on public.stage_tests for select to authenticated using (true);
create policy "words: read" on public.words for select to authenticated using (true);
create policy "word_sets: read" on public.word_sets for select to authenticated using (true);
create policy "word_set_items: read" on public.word_set_items for select to authenticated using (true);
create policy "writing_tasks: read published" on public.writing_tasks for select to authenticated
  using (status = 'published' or (select public.is_staff()));

-- Lesson exercises: published, in a lesson, and in a stage the user may access.
-- Test-only items (lesson_id is null) are visible to staff only.
create policy "exercises: read accessible" on public.exercises for select to authenticated
  using (
    (select public.is_staff())
    or (
      status = 'published'
      and lesson_id is not null
      and exists (
        select 1
        from public.lessons l
        join public.modules m on m.id = l.module_id
        where l.id = exercises.lesson_id
          and l.status = 'published'
          and public.can_access_stage(m.stage_id)
      )
    )
  );

-- Staff write access to every content table.
create policy "stages: staff write"           on public.stages           for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "modules: staff write"          on public.modules          for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "lessons: staff write"          on public.lessons          for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "media: staff write"            on public.media_assets     for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "exercises: staff write"        on public.exercises        for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "grammar_topics: staff write"   on public.grammar_topics   for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "error_tags: staff write"       on public.error_tags       for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "stage_tests: staff write"      on public.stage_tests      for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "stage_test_items: staff only"  on public.stage_test_items for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "words: staff write"            on public.words            for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "word_sets: staff write"        on public.word_sets        for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "word_set_items: staff write"   on public.word_set_items   for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "writing_tasks: staff write"    on public.writing_tasks    for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "content_jobs: staff only"      on public.content_jobs     for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "content_reviews: staff only"   on public.content_reviews  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------- Profiles ----------
create policy "profiles: read own" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Learners may change only these columns; plan, XP, level, streak and stage are server-managed.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, avatar_url, timezone, ielts_module, target_band, exam_date, daily_goal_minutes, onboarding_done)
  on public.profiles to authenticated;

create policy "user_roles: read own" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "user_roles: admin write" on public.user_roles for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "push_tokens: own" on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- Read-own tables (written only by Edge Functions) ----------
create policy "stage_test_attempts: read own" on public.stage_test_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy "placement_sessions: read own"  on public.placement_sessions  for select to authenticated using (user_id = (select auth.uid()));
create policy "placement_responses: read own" on public.placement_responses for select to authenticated
  using (exists (select 1 from public.placement_sessions s where s.id = session_id and s.user_id = (select auth.uid())));
create policy "skill_estimates: read own"     on public.skill_estimates     for select to authenticated using (user_id = (select auth.uid()));
create policy "study_plans: read own"         on public.study_plans         for select to authenticated using (user_id = (select auth.uid()));
create policy "stage_progress: read own"      on public.stage_progress      for select to authenticated using (user_id = (select auth.uid()));
create policy "daily_activity: read own"      on public.daily_activity      for select to authenticated using (user_id = (select auth.uid()));
create policy "xp_events: read own"           on public.xp_events           for select to authenticated using (user_id = (select auth.uid()));
create policy "usage_counters: read own"      on public.usage_counters      for select to authenticated using (user_id = (select auth.uid()));
create policy "subscriptions: read own"       on public.subscriptions       for select to authenticated using (user_id = (select auth.uid()));
create policy "writing_assessments: read own" on public.writing_assessments for select to authenticated
  using (exists (select 1 from public.writing_submissions s where s.id = submission_id and s.user_id = (select auth.uid())));

-- ---------- Tables the app writes directly ----------
-- Plan tasks: read own; mark done/skipped only.
create policy "plan_tasks: read own" on public.plan_tasks for select to authenticated using (user_id = (select auth.uid()));
create policy "plan_tasks: update own" on public.plan_tasks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.plan_tasks from authenticated, anon;
grant update (status, completed_at) on public.plan_tasks to authenticated;

create policy "lesson_progress: own" on public.lesson_progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "exercise_attempts: read own" on public.exercise_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy "exercise_attempts: insert own" on public.exercise_attempts for insert to authenticated with check (user_id = (select auth.uid()));

create policy "user_words: own" on public.user_words for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "srs_reviews: read own" on public.srs_reviews for select to authenticated using (user_id = (select auth.uid()));
create policy "srs_reviews: insert own" on public.srs_reviews for insert to authenticated with check (user_id = (select auth.uid()));

-- Writing: the app inserts a queued submission; the Edge Function scores it.
create policy "writing_submissions: read own" on public.writing_submissions for select to authenticated using (user_id = (select auth.uid()));
create policy "writing_submissions: insert own" on public.writing_submissions for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'queued');

-- Anonymous visitors get nothing from the public schema.
revoke all on all tables in schema public from anon;

-- =====================================================================
-- ERROR ANALYSIS VIEW (runs with the caller's permissions, so RLS applies)
-- =====================================================================
create view public.v_question_type_accuracy
with (security_invoker = true) as
select a.user_id,
       e.skill,
       e.question_type_tag,
       count(*) as attempts,
       avg(a.is_correct::int)::numeric(4,3) as accuracy
from public.exercise_attempts a
join public.exercises e on e.id = a.exercise_id
where e.question_type_tag is not null
group by a.user_id, e.skill, e.question_type_tag;

-- =====================================================================
-- REFERENCE DATA: the seven stages and their end-of-stage tests
-- =====================================================================
insert into public.stages (code, order_index, title, cefr_from, cefr_to, band_from, band_to, is_free, description) values
  ('foundation',         1, 'Foundation',         'A0',  'A1',  null, null, true,  'Alphabet, sounds, the 500 most common words and first grammar.'),
  ('elementary',         2, 'Elementary',         'A2',  'A2',  3.0,  4.0,  false, 'Everyday English and your first IELTS-style tasks.'),
  ('pre_intermediate',   3, 'Pre-Intermediate',   'B1',  'B1',  4.5,  5.0,  false, 'Longer texts, opinions and all four IELTS skills.'),
  ('intermediate',       4, 'Intermediate',       'B1+', 'B2',  5.5,  6.0,  false, 'Full IELTS question types and essay structure.'),
  ('upper_intermediate', 5, 'Upper-Intermediate', 'B2+', 'B2+', 6.5,  7.0,  false, 'Precision, range and exam strategy.'),
  ('advanced',           6, 'Advanced',           'C1',  'C1',  7.5,  8.0,  false, 'Academic vocabulary and complex grammar under time pressure.'),
  ('mastery',            7, 'Mastery',            'C2',  'C2',  8.5,  9.0,  false, 'Near-native accuracy and nuance.');

insert into public.stage_tests (stage_id, pass_percent, time_limit_sec)
select id, 70, 30 * 60 from public.stages;
