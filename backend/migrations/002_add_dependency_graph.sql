-- Create Call Edges Table
create table if not exists call_edges (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id) on delete cascade,
  source_id uuid references events(run_id) on delete cascade,
  target_id uuid references events(run_id) on delete cascade,
  overlap_score float default 0.0,
  overlap_type text default 'exact',
  tokens_transferred integer default 0,
  created_at timestamp with time zone default now()
);

-- Add Dependency Metrics to Workflows
alter table workflows 
add column if not exists graph_computed boolean default false,
add column if not exists dead_branch_waste decimal(10, 6) default 0,
add column if not exists critical_path_latency integer default 0,
add column if not exists information_efficiency float default 0;

-- Add index for performance
create index if not exists idx_call_edges_workflow_id on call_edges(workflow_id);
create index if not exists idx_call_edges_source_id on call_edges(source_id);
create index if not exists idx_call_edges_target_id on call_edges(target_id);
