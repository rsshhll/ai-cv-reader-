-- Run this in your Supabase SQL Editor

-- 1. Create the bucket for resumes (assuming you haven't via UI)
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', true)
on conflict (id) do nothing;

-- Allow public read access to resumes
create policy "Public Access" on storage.objects for select using ( bucket_id = 'resumes' );
-- Allow authenticated/service role insert
create policy "Insert Access" on storage.objects for insert with check ( bucket_id = 'resumes' );

-- 2. Create the candidates table
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  resume_url text,
  job_description text,
  match_score int,
  seniority_level text,
  skills jsonb,
  strengths jsonb,
  gaps jsonb,
  interview_questions jsonb,
  status text default 'pending',  -- pending | shortlisted | rejected
  created_at timestamptz default now()
);
