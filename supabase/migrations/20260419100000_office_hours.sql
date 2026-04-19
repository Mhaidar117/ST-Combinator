-- Office Hours: 1-on-1 critic chat threads
-- Migration not yet applied. Human must run it before merging.

-- Stores full conversation threads keyed by (analysis_id, role).
create table public.office_hours_threads (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  role text not null check (role in (
    'vc_partner', 'customer_skeptic', 'growth_lead',
    'product_strategist', 'technical_reviewer', 'competitor_analyst'
  )),
  messages jsonb not null default '[]'::jsonb,
  user_turns int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (analysis_id, role)
);

create index office_hours_threads_analysis_id_idx
  on public.office_hours_threads (analysis_id);

-- RLS: only the analysis owner can read or write.
alter table public.office_hours_threads enable row level security;

create policy "office_hours_all_own" on public.office_hours_threads
  for all using (
    exists (
      select 1 from public.analyses a
      join public.startups s on s.id = a.startup_id
      where a.id = office_hours_threads.analysis_id
        and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.analyses a
      join public.startups s on s.id = a.startup_id
      where a.id = office_hours_threads.analysis_id
        and s.user_id = auth.uid()
    )
  );
