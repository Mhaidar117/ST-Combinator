-- Temporarily relax the Stripe-paywall during development:
-- - Default monthly credit limit becomes 20 (same as Pro plan).
-- - Backfill any existing user whose limit is still the old default of 3.
--
-- We deliberately leave plan_tier and the stripe_customer_id columns alone so
-- the Stripe webhook code path keeps working unchanged. Re-tightening the
-- limits later only requires reverting this migration + the gate flags in
-- lib/usage/limits.ts.

alter table public.users_profile
  alter column monthly_credit_limit set default 20;

update public.users_profile
  set monthly_credit_limit = 20
  where monthly_credit_limit < 20;
