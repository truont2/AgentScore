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
  status text,
  total_cost float default 0,
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
  created_at timestamp with time zone default now()
);
