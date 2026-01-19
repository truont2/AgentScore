-- Migration: Add sub-scores and optimized score columns to analyses table
-- This migration is safe to run on existing databases (preserves data)

ALTER TABLE analyses 
  ADD COLUMN IF NOT EXISTS sub_scores jsonb,
  ADD COLUMN IF NOT EXISTS optimized_sub_scores jsonb,
  ADD COLUMN IF NOT EXISTS optimized_score integer,
  ADD COLUMN IF NOT EXISTS savings_breakdown jsonb;

-- Optional: Add comments for documentation
COMMENT ON COLUMN analyses.sub_scores IS 'Current state category scores: {redundancy, model_fit, context_efficiency} (0-100)';
COMMENT ON COLUMN analyses.optimized_sub_scores IS 'Predicted scores after all fixes applied';
COMMENT ON COLUMN analyses.optimized_score IS 'Predicted overall efficiency score after optimizations';
COMMENT ON COLUMN analyses.savings_breakdown IS 'Dollar savings per category: {redundancy_savings, model_fit_savings, context_efficiency_savings, total_savings}';
