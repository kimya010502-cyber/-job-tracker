-- job-tracker v2: Supabase 스키마 + RLS
-- Supabase 대시보드 > SQL Editor 에서 그대로 실행하세요.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  position text not null,
  applied_at date not null,
  job_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  name text not null,
  stage_type text,
  order_index int not null,
  status text not null default '예정',
  scheduled_at date,
  result_at date,
  document_checked_at date,
  status_changed_at timestamptz,
  status_change_source text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_applications_user_id on public.applications(user_id);
create index if not exists idx_stages_application_id on public.stages(application_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select, insert, update, delete on public.stages to authenticated;

alter table public.applications enable row level security;
alter table public.stages enable row level security;

create policy "applications: owner full access"
  on public.applications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "stages: owner full access"
  on public.stages
  for all
  using (
    exists (
      select 1 from public.applications a
      where a.id = stages.application_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.applications a
      where a.id = stages.application_id and a.user_id = auth.uid()
    )
  );

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

create trigger stages_set_updated_at
  before update on public.stages
  for each row execute function public.set_updated_at();
