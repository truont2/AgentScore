-- Enable pgcrypto for UUID generation if not already enabled
create extension if not exists "pgcrypto";

-- Drop existing tables (Warning: Deletes all data)
drop table if exists analyses;
drop table if exists events;
drop table if exists workflows;

-- Create Workflows Table
create table workflows (
  id uuid primary key default gen_random_uuid(),
  name text,
  status text default 'pending',
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  total_calls integer default 0,
  total_cost decimal(10, 6) default 0,
  created_at timestamp with time zone default now()
);

-- Create Events Table
create table events (
  run_id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id),
  parent_run_id uuid,
  event_type text,
  model text,
  prompt jsonb,
  response jsonb,
  tokens_in integer,
  tokens_out integer,
  cost float,
  latency_ms integer,
  node_type text default 'normal',
  created_at timestamp with time zone default now()
);

-- Create Analyses Table (with new Score columns)
create table analyses (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id),
  original_cost float,
  optimized_cost float,
  redundancies jsonb,
  model_overkill jsonb,
  prompt_bloat jsonb,
  efficiency_score integer,
  efficiency_grade text,
  sub_scores jsonb,
  optimized_sub_scores jsonb,
  optimized_score integer,
  savings_breakdown jsonb,
  created_at timestamp with time zone default now()
);

-- Create Call Edges Table (Missing Link)
create table call_edges (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id),
  source_id uuid references events(run_id),
  target_id uuid references events(run_id),
  overlap_score float,
  overlap_type text,
  created_at timestamp with time zone default now()
);

-- Add metrics columns to Workflows (Idempotent update)
alter table workflows add column if not exists dead_branch_waste float default 0;
alter table workflows add column if not exists critical_path_latency integer default 0;
alter table workflows add column if not exists information_efficiency float default 0;
alter table events add column if not exists node_type text default 'normal';
