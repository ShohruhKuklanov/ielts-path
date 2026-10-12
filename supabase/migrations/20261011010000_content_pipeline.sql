-- Step 3: content pipeline.
-- Lessons carry the syllabus plan (CEFR, goals, target language) so the AI and
-- human writers get the same brief, and reviews are tracked on the lesson.

alter table public.lessons
  add column cefr public.cefr,
  add column goals text[] not null default '{}',
  add column target_language text[] not null default '{}',
  add column source text not null default 'human' check (source in ('human', 'ai')),
  add column review_notes text,
  add column reviewed_by uuid references public.profiles on delete set null,
  add column reviewed_at timestamptz;

create index lessons_status_idx on public.lessons (status);

-- Approving or rejecting a lesson moves its exercises with it, in one step.
create or replace function public.review_lesson(p_lesson_id int, p_decision text, p_notes text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  new_status public.content_status;
begin
  if not public.is_staff() then
    raise exception 'Only staff can review lessons' using errcode = '42501';
  end if;

  new_status := case p_decision
    when 'approve' then 'published'
    when 'request_changes' then 'draft'
    when 'reject' then 'archived'
    else null end;
  if new_status is null then
    raise exception 'Unknown decision: %', p_decision using errcode = '22023';
  end if;

  update public.lessons
     set status = new_status, review_notes = p_notes, reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_lesson_id;
  if not found then
    raise exception 'Lesson % not found', p_lesson_id using errcode = 'P0002';
  end if;

  update public.exercises set status = new_status where lesson_id = p_lesson_id;

  insert into public.content_reviews (entity_type, entity_id, reviewer_id, decision, notes)
  values ('lesson', p_lesson_id::text, auth.uid(), p_decision, p_notes);
end;
$$;

revoke all on function public.review_lesson(int, text, text) from public, anon;
grant execute on function public.review_lesson(int, text, text) to authenticated;

-- Give someone admin or editor rights by email. Only the database owner can run
-- this (from Supabase Studio's SQL editor or the make-admin script), never the app.
create or replace function public.grant_staff(p_email text, p_role text default 'admin')
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then
    return 'No user with email ' || p_email || ' yet. Sign in to the admin panel once, then run this again.';
  end if;
  insert into public.user_roles (user_id, role) values (uid, p_role) on conflict do nothing;
  return p_email || ' is now ' || p_role;
end;
$$;

revoke all on function public.grant_staff(text, text) from public, anon, authenticated;
