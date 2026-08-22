-- ТАМЫР — schema. Run in Supabase SQL editor, in order with seed.sql.
create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student','teacher')) default 'student',
  full_name text not null,
  grade int,
  school text,
  lang text not null default 'ru' check (lang in ('ru','kk','en')),
  created_at timestamptz not null default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_ru text not null,
  title_kk text not null,
  title_en text not null
);

create table if not exists nodes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  code text not null,
  title_ru text not null,
  title_kk text not null,
  title_en text not null,
  grade int not null,
  summary text not null default '',
  order_index int not null default 0,
  unique (subject_id, code)
);

create table if not exists edges (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  prerequisite_node_id uuid not null references nodes(id) on delete cascade,
  dependent_node_id uuid not null references nodes(id) on delete cascade,
  unique (prerequisite_node_id, dependent_node_id)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references nodes(id) on delete cascade,
  difficulty int not null check (difficulty between 1 and 5),
  type text not null check (type in ('choice','number','short')),
  prompt text not null,
  options jsonb,
  answer text not null,
  solution text not null,
  lang text not null default 'ru'
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  node_id uuid not null references nodes(id) on delete cascade,
  is_correct boolean not null,
  answer_given text,
  time_spent_ms int,
  hints_used int not null default 0,
  ai_feedback text,
  created_at timestamptz not null default now()
);

create table if not exists mastery (
  user_id uuid not null references profiles(id) on delete cascade,
  node_id uuid not null references nodes(id) on delete cascade,
  score int not null default 0 check (score between 0 and 100),
  status text not null default 'unknown' check (status in ('unknown','gap','learning','mastered')),
  last_seen_at timestamptz,
  primary key (user_id, node_id)
);

create table if not exists diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  answers jsonb not null default '[]',
  root_node_id uuid references nodes(id),
  summary text,
  created_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  target_date date,
  target_score int,
  roadmap jsonb default '[]'
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  subject_id uuid not null references subjects(id),
  join_code text not null unique
);

create table if not exists class_members (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  image_path text,
  result jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  feature text not null,
  latency_ms int,
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table subjects enable row level security;
alter table nodes enable row level security;
alter table edges enable row level security;
alter table tasks enable row level security;
alter table attempts enable row level security;
alter table mastery enable row level security;
alter table diagnostics enable row level security;
alter table goals enable row level security;
alter table classes enable row level security;
alter table class_members enable row level security;
alter table scans enable row level security;
alter table ai_events enable row level security;

-- public read reference data
create policy "public read subjects" on subjects for select using (true);
create policy "public read nodes" on nodes for select using (true);
create policy "public read edges" on edges for select using (true);
create policy "public read tasks" on tasks for select using (true);

-- profiles: self read/write; teachers can read their students' profiles
create policy "self profile" on profiles for select using (auth.uid() = id);
create policy "self profile update" on profiles for update using (auth.uid() = id);
create policy "self profile insert" on profiles for insert with check (auth.uid() = id);
-- "approved" only: a pending join request lets the teacher see the request
-- itself (listPendingMembers reads class_members directly), not the
-- student's actual profile/attempts/mastery before they've accepted them.
create policy "teacher reads class students" on profiles for select using (
  exists (
    select 1 from class_members cm join classes c on c.id = cm.class_id
    where cm.student_id = profiles.id and c.teacher_id = auth.uid() and cm.status = 'approved'
  )
);

-- attempts / mastery / diagnostics / goals / scans: owner only, teacher of their class can read
create policy "own attempts" on attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "teacher reads student attempts" on attempts for select using (
  exists (select 1 from class_members cm join classes c on c.id = cm.class_id where cm.student_id = attempts.user_id and c.teacher_id = auth.uid() and cm.status = 'approved')
);

create policy "own mastery" on mastery for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "teacher reads student mastery" on mastery for select using (
  exists (select 1 from class_members cm join classes c on c.id = cm.class_id where cm.student_id = mastery.user_id and c.teacher_id = auth.uid() and cm.status = 'approved')
);

create policy "own diagnostics" on diagnostics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own goals" on goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own scans" on scans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own ai_events" on ai_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- classes: teacher owns; students see classes they joined
--
-- classes and class_members each need to check the other table, which would
-- normally cause "infinite recursion detected in policy" (each table's RLS
-- re-triggers the other's). SECURITY DEFINER functions run as their owner,
-- and table owners are exempt from RLS by default, so the lookup *inside*
-- these functions doesn't re-trigger the policy it's called from — see
-- fix_rls_recursion.sql for the same fix applied to an already-existing project.
create or replace function is_class_teacher(target_class_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from classes c where c.id = target_class_id and c.teacher_id = auth.uid());
$$;

create or replace function is_class_member(target_class_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from class_members cm where cm.class_id = target_class_id and cm.student_id = auth.uid());
$$;

create policy "teacher manages classes" on classes for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
create policy "members read class" on classes for select using (is_class_member(classes.id));

create policy "teacher manages members" on class_members for all
  using (is_class_teacher(class_members.class_id))
  with check (is_class_teacher(class_members.class_id));
create policy "student joins class" on class_members for insert with check (auth.uid() = student_id);
create policy "student reads own membership" on class_members for select using (auth.uid() = student_id);
