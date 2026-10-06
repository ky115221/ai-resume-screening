-- AI ResumeScreen production schema (PostgreSQL / Supabase). Safe to run more than once.
create table if not exists users (
  id serial primary key, email text unique not null, password_hash text not null, name text not null, created_at timestamptz default now());
create table if not exists jobs (
  id serial primary key, title text not null, department text default '', description text default '',
  required_skills jsonb not null default '[]', preferred_skills jsonb not null default '[]',
  minimum_experience double precision default 0, education text default 'Bachelor', threshold integer default 80, created_at timestamptz default now());
create table if not exists candidates (
  id serial primary key, job_id integer not null references jobs(id) on delete cascade,
  name text, email text, phone text, education text, experience double precision default 0,
  skills jsonb default '[]', projects jsonb default '[]', certifications jsonb default '[]',
  resume_file text, storage_path text, resume_text text, created_at timestamptz default now());
create table if not exists analysis_results (
  candidate_id integer primary key references candidates(id) on delete cascade, job_id integer references jobs(id) on delete cascade,
  match_score integer, recommendation text, result jsonb, created_at timestamptz default now());
create table if not exists hr_decisions (
  candidate_id integer primary key references candidates(id) on delete cascade,
  decision text not null check (decision in ('APPROVED','REJECTED','ON_REVIEW')), comments text default '', decided_by text, decided_at timestamptz default now());
create table if not exists settings (id integer primary key check (id = 1), value jsonb not null);
create index if not exists candidates_job_idx on candidates(job_id);
-- The API connects with the server-side database role, so lock the tables against the public anon key.
alter table users enable row level security; alter table jobs enable row level security; alter table candidates enable row level security;
alter table analysis_results enable row level security; alter table hr_decisions enable row level security; alter table settings enable row level security;
