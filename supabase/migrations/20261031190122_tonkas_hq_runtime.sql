create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.tonkas_agents (
  id text primary key, name text not null, role text not null, department text not null,
  objective text not null, status text not null default 'idle'
    check (status in ('idle','queued','planning','working','reviewing','blocked','needs_setup')),
  current_task text, x double precision not null default 0.5, y double precision not null default 0.5,
  updated_at timestamptz not null default now()
);

create table if not exists public.tonkas_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  assigned_to text references public.tonkas_agents(id),
  created_by text not null default 'matt',
  status text not null default 'queued' check (status in ('queued','running','completed','blocked','needs_review')),
  priority text not null default 'normal' check (priority in ('high','normal','low')),
  department text, result text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists tonkas_tasks_queue_idx on public.tonkas_tasks(status,priority,created_at);
create index if not exists tonkas_tasks_agent_idx on public.tonkas_tasks(assigned_to,updated_at desc);

create table if not exists public.tonkas_messages (
  id uuid primary key default gen_random_uuid(), room text not null default 'command',
  sender_id text not null, recipient_id text, content text not null check (char_length(content)<=10000),
  created_at timestamptz not null default now()
);
create index if not exists tonkas_messages_created_idx on public.tonkas_messages(created_at desc);

create table if not exists public.tonkas_approvals (
  id uuid primary key default gen_random_uuid(), title text not null, context text not null default '',
  recommended_option text, options jsonb not null
    check (jsonb_typeof(options)='array' and jsonb_array_length(options)=5),
  status text not null default 'pending' check (status in ('pending','answered','cancelled')),
  answer jsonb, created_by text not null default 'matt',
  created_at timestamptz not null default now(), answered_at timestamptz
);
create index if not exists tonkas_approvals_pending_idx on public.tonkas_approvals(status,created_at desc);

create table if not exists public.tonkas_activity (
  id uuid primary key default gen_random_uuid(), kind text not null, actor text not null,
  message text not null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tonkas_activity_created_idx on public.tonkas_activity(created_at desc);

create table if not exists public.tonkas_settings (
  key text primary key, value text not null, updated_at timestamptz not null default now()
);

insert into public.tonkas_agents(id,name,role,department,objective,x,y) values
('matt','Matt','CEO & Chief of Staff','command','Own strategy, coordinate the team, create plans, review work, and escalate consequential decisions.',0.50,0.42),
('dennis','Dennis','Research Lead','research','Research opportunities, validate demand, compare alternatives, and write evidence-based briefs.',0.45,0.55),
('finn','Finn','Sales & Orders','factory','Manage inbound sales and order workflows; prepare customer-facing drafts for approval.',0.35,0.72),
('bunc','Bunc','Product Operations','factory','Turn approved ideas into specifications, checklists, and delivery plans.',0.42,0.70),
('maverick','Maverick','Marketing Lead','media','Plan content, prepare drafts, and maintain brand consistency.',0.63,0.30),
('pham','Pham','Finance & Revenue','revenue','Track financial inputs, prepare budgets, and flag unusual costs. Never move money.',0.23,0.30),
('luke','Luke','Engineering Lead','factory','Plan software work, review technical risks, and report test results.',0.38,0.78),
('trevor','Trevor','Quality & Risk','war','Review deliverables, identify risks, and verify acceptance criteria.',0.72,0.52),
('ivy','Ivy','Customer Research','research','Summarize customer feedback and identify recurring problems.',0.46,0.48),
('noah','Noah','Operations Analyst','command','Track task throughput, blockers, and operational metrics.',0.54,0.48)
on conflict(id) do nothing;

insert into public.tonkas_settings(key,value) values
('autonomy_enabled','false'),
('company_goal','Build a sustainable online business. Prioritize validated customer value, low operating cost, and reliable delivery.')
on conflict(key) do nothing;

alter table public.tonkas_agents enable row level security;
alter table public.tonkas_tasks enable row level security;
alter table public.tonkas_messages enable row level security;
alter table public.tonkas_approvals enable row level security;
alter table public.tonkas_activity enable row level security;
alter table public.tonkas_settings enable row level security;

revoke all on public.tonkas_agents,public.tonkas_tasks,public.tonkas_messages,
  public.tonkas_approvals,public.tonkas_activity,public.tonkas_settings from anon,authenticated;
grant all on public.tonkas_agents,public.tonkas_tasks,public.tonkas_messages,
  public.tonkas_approvals,public.tonkas_activity,public.tonkas_settings to service_role;

create or replace function public.tonkas_verify_secret(p_token text,p_secret_name text)
returns boolean language sql stable security definer set search_path=pg_catalog,vault
as $$
  select exists(select 1 from vault.decrypted_secrets
    where name=p_secret_name and decrypted_secret=p_token);
$$;
revoke all on function public.tonkas_verify_secret(text,text) from public,anon,authenticated;
grant execute on function public.tonkas_verify_secret(text,text) to service_role;

do $$
begin
  if not exists(select 1 from vault.secrets where name='tonkas_admin_token') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),
      'tonkas_admin_token','Private owner control token for Tonkas Town HQ');
  end if;
  if not exists(select 1 from vault.secrets where name='tonkas_cron_token') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),
      'tonkas_cron_token','Private scheduled worker token for Tonkas Town HQ');
  end if;
end $$;
