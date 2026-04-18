-- analysis_traces: one row per LLM call, repair pass, or tool invocation.
-- Used by /api/debug/traces/:id (per-analysis inspection) and /api/metrics
-- (schemaSuccessRate, pipelineLatencyP50P95).
create table public.analysis_traces (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  -- "normalize" | "committee:vc_partner" | ... | "synthesis" | "tool:lookup_competitors"
  stage text not null,
  -- Model name for LLM rows (e.g. "gpt-4o-mini"); null for tool rows.
  model text,
  -- 1 = first try; 2 = repair pass after first failed schema validation.
  attempt smallint not null default 1,
  -- Ok = LLM produced a schema-valid output (or tool returned data without error).
  ok boolean not null,
  latency_ms integer not null,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  error_message text,
  -- First ~500 chars of model output / tool result for inspection.
  output_excerpt text,
  -- Non-null only when stage like 'tool:%'.
  tool_name text,
  tool_args jsonb,
  created_at timestamptz not null default now()
);

create index analysis_traces_analysis_id_idx
  on public.analysis_traces (analysis_id);
create index analysis_traces_stage_idx
  on public.analysis_traces (stage);
create index analysis_traces_created_at_idx
  on public.analysis_traces (created_at desc);

-- Service role writes/reads; the per-analysis debug route uses the user
-- session client and joins through analyses ownership.
alter table public.analysis_traces enable row level security;

create policy "traces_select_own" on public.analysis_traces
  for select using (
    exists (
      select 1
      from public.analyses a
      join public.startups s on s.id = a.startup_id
      where a.id = analysis_traces.analysis_id
        and s.user_id = auth.uid()
    )
  );

-- Match startup uploaded-doc embeddings by cosine similarity. Used by the
-- synthesis tool `search_uploaded_docs`. Falls back to in-memory cosine in
-- TS if the function is missing, so this is optional but faster.
create or replace function public.match_startup_embeddings(
  p_startup_id uuid,
  p_query vector(1536),
  p_match_count integer default 5
) returns table (
  chunk_text text,
  similarity float
) language sql stable as $$
  select
    e.chunk_text,
    1 - (e.embedding <=> p_query) as similarity
  from public.embeddings e
  where e.owner_type = 'startup_upload'
    and e.owner_id = p_startup_id
    and e.embedding is not null
  order by e.embedding <=> p_query
  limit greatest(1, least(p_match_count, 20));
$$;

-- Allow authenticated and anon (the synthesis tool calls via the service-role
-- client which bypasses RLS regardless, but granting here keeps the API
-- explicit for any future user-side use).
grant execute on function public.match_startup_embeddings(uuid, vector, integer)
  to anon, authenticated, service_role;
