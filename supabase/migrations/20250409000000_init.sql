-- Enable extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- users_profile
create table public.users_profile (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text,
  plan_tier text not null default 'free',
  monthly_credit_limit int not null default 3,
  monthly_credit_used int not null default 0,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- startups
create table public.startups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile (id) on delete cascade,
  name text not null,
  one_liner text not null,
  problem text not null,
  target_customer text not null,
  why_now text not null,
  pricing_model text not null,
  go_to_market text not null,
  competitors text[] not null default '{}',
  unfair_advantage text not null,
  stage text not null check (stage in ('idea', 'mvp', 'revenue')),
  website_url text,
  founder_background text,
  constraints text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index startups_user_id_idx on public.startups (user_id);

-- startup_uploads
create table public.startup_uploads (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups (id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  extracted_text text,
  created_at timestamptz not null default now()
);

create index startup_uploads_startup_id_idx on public.startup_uploads (startup_id);

-- analyses
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups (id) on delete cascade,
  run_type text not null check (run_type in ('quick_roast', 'committee', 'deep')),
  tone text not null check (tone in ('polite', 'direct', 'brutal')) default 'direct',
  status text not null check (status in ('queued', 'processing', 'completed', 'failed')) default 'queued',
  input_snapshot jsonb not null,
  canonical_brief jsonb,
  verdict text,
  summary text,
  confidence_score numeric,
  share_token text unique,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index analyses_startup_id_idx on public.analyses (startup_id);
create index analyses_share_token_idx on public.analyses (share_token) where share_token is not null;

-- analysis_scores
create table public.analysis_scores (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  problem_severity int not null,
  customer_clarity int not null,
  market_timing int not null,
  distribution_plausibility int not null,
  monetization_strength int not null,
  defensibility int not null,
  founder_market_fit int not null,
  speed_to_mvp int not null,
  retention_potential int not null,
  investor_attractiveness int not null,
  overall_score numeric not null,
  created_at timestamptz not null default now()
);

create unique index analysis_scores_one_per_analysis on public.analysis_scores (analysis_id);

-- analysis_sections
create table public.analysis_sections (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  section_type text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index analysis_sections_analysis_id_idx on public.analysis_sections (analysis_id);

-- subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile (id) on delete cascade,
  stripe_subscription_id text unique not null,
  stripe_price_id text not null,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);

-- embeddings
create table public.embeddings (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null,
  owner_id uuid not null,
  chunk_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index embeddings_owner_idx on public.embeddings (owner_type, owner_id);

-- RLS
alter table public.users_profile enable row level security;
alter table public.startups enable row level security;
alter table public.startup_uploads enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_scores enable row level security;
alter table public.analysis_sections enable row level security;
alter table public.subscriptions enable row level security;
alter table public.embeddings enable row level security;

-- Helper: users can only see own profile
create policy "users_profile_select_own" on public.users_profile
  for select using (auth.uid() = id);

create policy "users_profile_update_own" on public.users_profile
  for update using (auth.uid() = id);

create policy "users_profile_insert_own" on public.users_profile
  for insert with check (auth.uid() = id);

-- Startups
create policy "startups_all_own" on public.startups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Uploads via startup ownership
create policy "uploads_all_own" on public.startup_uploads
  for all using (
    exists (
      select 1 from public.startups s
      where s.id = startup_uploads.startup_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.startups s
      where s.id = startup_uploads.startup_id and s.user_id = auth.uid()
    )
  );

-- Analyses via startup ownership
create policy "analyses_all_own" on public.analyses
  for all using (
    exists (
      select 1 from public.startups s
      where s.id = analyses.startup_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.startups s
      where s.id = analyses.startup_id and s.user_id = auth.uid()
    )
  );

-- Public read: share token only (sanitized use in app)
create policy "analyses_select_public_share" on public.analyses
  for select using (share_token is not null);

-- Scores
create policy "scores_all_own" on public.analysis_scores
  for all using (
    exists (
      select 1 from public.analyses a
      join public.startups s on s.id = a.startup_id
      where a.id = analysis_scores.analysis_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.analyses a
      join public.startups s on s.id = a.startup_id
      where a.id = analysis_scores.analysis_id and s.user_id = auth.uid()
    )
  );

create policy "scores_select_public_share" on public.analysis_scores
  for select using (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_scores.analysis_id and a.share_token is not null
    )
  );

-- Sections
create policy "sections_all_own" on public.analysis_sections
  for all using (
    exists (
      select 1 from public.analyses a
      join public.startups s on s.id = a.startup_id
      where a.id = analysis_sections.analysis_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.analyses a
      join public.startups s on s.id = a.startup_id
      where a.id = analysis_sections.analysis_id and s.user_id = auth.uid()
    )
  );

create policy "sections_select_public_share" on public.analysis_sections
  for select using (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_sections.analysis_id and a.share_token is not null
    )
  );

-- Subscriptions
create policy "subscriptions_own" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Embeddings: owner is user via startup or analysis — simplified: service role only for writes
create policy "embeddings_select_own" on public.embeddings
  for select using (
    exists (
      select 1 from public.startups s
      where s.id = embeddings.owner_id and embeddings.owner_type = 'startup' and s.user_id = auth.uid()
    )
    or exists (
      select 1 from public.analyses a
      join public.startups s on s.id = a.startup_id
      where a.id = embeddings.owner_id and embeddings.owner_type = 'analysis' and s.user_id = auth.uid()
    )
  );

-- Service role bypasses RLS by default in Supabase
