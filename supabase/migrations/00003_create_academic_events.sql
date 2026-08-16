create table public.academic_events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  type text not null check (type in ('Assignment', 'Submission', 'Class Test', 'Internal Exam', 'Semester Exam', 'Lab Exam', 'Important Notice', 'Other')),
  subject text,
  start_time timestamp with time zone,
  deadline timestamp with time zone,
  year text not null check (year in ('1', '2', '3', '4', 'All')),
  branch text not null check (branch in ('CSE', 'ECE', 'EEE', 'ME', 'CIVIL', 'All')),
  section text not null check (section in ('A', 'B', 'C', 'All')),
  attachment_url text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.academic_events enable row level security;

-- Select Policy: Authenticated users can view
create policy "Authenticated users can view academic events"
  on public.academic_events for select
  to authenticated
  using (true);

-- Insert Policy: Admins can insert
create policy "Admins can insert academic events"
  on public.academic_events for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Update Policy: Admins can update
create policy "Admins can update academic events"
  on public.academic_events for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Delete Policy: Admins can delete
create policy "Admins can delete academic events"
  on public.academic_events for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Indexes for frequent filtering
create index idx_academic_events_is_active on public.academic_events(is_active);
create index idx_academic_events_year on public.academic_events(year);
create index idx_academic_events_branch on public.academic_events(branch);
create index idx_academic_events_section on public.academic_events(section);
create index idx_academic_events_start_time on public.academic_events(start_time);
create index idx_academic_events_deadline on public.academic_events(deadline);

-- Updated_at trigger (using the handle_updated_at function created in 00001_create_profiles.sql)
create trigger set_academic_events_updated_at
  before update on public.academic_events
  for each row
  execute procedure public.handle_updated_at();
