alter table public.tonkas_agents drop constraint if exists tonkas_agents_status_check;
alter table public.tonkas_agents add constraint tonkas_agents_status_check
check (status = any (array['idle','queued','planning','working','reviewing','blocked','needs_setup','meeting','researching']::text[]));