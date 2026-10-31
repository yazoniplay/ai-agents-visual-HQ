create table if not exists public.tonkas_meetings (
 id uuid primary key default gen_random_uuid(),
 started_at timestamptz not null default now(),
 summary text not null,
 decisions jsonb not null default '[]'::jsonb,
 attendees jsonb not null default '[]'::jsonb,
 next_meeting_at timestamptz,
 provider text,
 created_at timestamptz not null default now()
);
create index if not exists tonkas_meetings_started_at_idx on public.tonkas_meetings (started_at desc);
alter table public.tonkas_meetings enable row level security;

create table if not exists public.tonkas_opportunities (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 problem text not null,
 buyer text,
 buying_signal text,
 evidence_level text not null default 'unverified' check (evidence_level in ('anecdotal','repeated','strong','unverified')),
 source_url text,
 source_platform text,
 quote_excerpt text,
 estimated_wtp text,
 status text not null default 'new' check (status in ('new','researching','validated','rejected','owner_review')),
 score integer check (score between 1 and 10),
 discovered_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 research_notes text,
 created_by text not null default 'ivy'
);
create index if not exists tonkas_opportunities_status_discovered_idx on public.tonkas_opportunities (status, discovered_at desc);
alter table public.tonkas_opportunities enable row level security;