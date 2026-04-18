import type { RunType, Tone, AnalysisStatus } from "./analysis";

export type UsersProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  plan_tier: string;
  monthly_credit_limit: number;
  monthly_credit_used: number;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type StartupRow = {
  id: string;
  user_id: string;
  name: string;
  one_liner: string;
  problem: string;
  target_customer: string;
  why_now: string;
  pricing_model: string;
  go_to_market: string;
  competitors: string[];
  unfair_advantage: string;
  stage: string;
  website_url: string | null;
  founder_background: string | null;
  constraints: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalysisRow = {
  id: string;
  startup_id: string;
  run_type: RunType;
  tone: Tone;
  status: AnalysisStatus;
  input_snapshot: Record<string, unknown>;
  canonical_brief: Record<string, unknown> | null;
  verdict: string | null;
  summary: string | null;
  confidence_score: string | null;
  share_token: string | null;
  created_at: string;
  completed_at: string | null;
};

export type AnalysisScoreRow = {
  id: string;
  analysis_id: string;
  problem_severity: number;
  customer_clarity: number;
  market_timing: number;
  distribution_plausibility: number;
  monetization_strength: number;
  defensibility: number;
  founder_market_fit: number;
  speed_to_mvp: number;
  retention_potential: number;
  investor_attractiveness: number;
  overall_score: string;
  created_at: string;
};
