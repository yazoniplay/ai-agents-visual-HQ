alter table public.tonkas_meetings
  add column if not exists title text,
  add column if not exists agenda jsonb not null default '[]'::jsonb,
  add column if not exists discussion jsonb not null default '[]'::jsonb,
  add column if not exists action_items jsonb not null default '[]'::jsonb,
  add column if not exists ended_at timestamptz,
  add column if not exists duration_seconds integer;
update public.tonkas_meetings set title=coalesce(nullif(title,''),'Executive operating review') where title is null or title='';
create table if not exists public.tonkas_agent_profiles (
 agent_id text primary key references public.tonkas_agents(id) on delete cascade,
 specialty text not null, mission text not null,
 responsibilities jsonb not null default '[]'::jsonb,
 procedure jsonb not null default '[]'::jsonb,
 quality_bar jsonb not null default '[]'::jsonb,
 guardrails jsonb not null default '[]'::jsonb,
 procedure_version integer not null default 1,
 updated_at timestamptz not null default now()
);
create table if not exists public.tonkas_agent_procedure_versions (
 id uuid primary key default gen_random_uuid(),
 agent_id text not null references public.tonkas_agents(id) on delete cascade,
 version integer not null, procedure jsonb not null,
 change_note text not null default 'Initial specialist operating procedure',
 created_at timestamptz not null default now(), unique(agent_id,version)
);
create table if not exists public.tonkas_agent_memory (
 id uuid primary key default gen_random_uuid(),
 agent_id text not null references public.tonkas_agents(id) on delete cascade,
 memory_type text not null default 'lesson', content text not null,
 source_task_id uuid references public.tonkas_tasks(id) on delete set null,
 confidence numeric(4,3) not null default 0.800,
 created_at timestamptz not null default now(),
 unique(agent_id,source_task_id,memory_type)
);
create index if not exists tonkas_agent_memory_recent_idx on public.tonkas_agent_memory(agent_id,created_at desc);
create table if not exists public.tonkas_agent_runs (
 id uuid primary key default gen_random_uuid(),
 agent_id text not null references public.tonkas_agents(id) on delete cascade,
 task_id uuid references public.tonkas_tasks(id) on delete set null,
 provider text, model text, status text not null, procedure_version integer,
 started_at timestamptz not null default now(), finished_at timestamptz,
 summary text, sources jsonb not null default '[]'::jsonb,
 memory_updates jsonb not null default '[]'::jsonb
);
create index if not exists tonkas_agent_runs_recent_idx on public.tonkas_agent_runs(agent_id,started_at desc);
alter table public.tonkas_agent_profiles enable row level security;
alter table public.tonkas_agent_procedure_versions enable row level security;
alter table public.tonkas_agent_memory enable row level security;
alter table public.tonkas_agent_runs enable row level security;
revoke all on public.tonkas_agent_profiles,public.tonkas_agent_procedure_versions,public.tonkas_agent_memory,public.tonkas_agent_runs from anon,authenticated;
grant all on public.tonkas_agent_profiles,public.tonkas_agent_procedure_versions,public.tonkas_agent_memory,public.tonkas_agent_runs to service_role;
