-- Lets content:load update lessons whose files changed, without touching
-- lessons that learners have already used.
alter table public.lessons add column content_hash text;
