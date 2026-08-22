-- Fixes "infinite recursion detected in policy for relation classes/class_members".
-- Root cause: classes."members read class" reads class_members, and
-- class_members."teacher manages members" reads classes — each triggers the
-- other's RLS policy, looping forever. This also broke every query that
-- transitively joins through both (profiles' "teacher reads class students",
-- attempts/mastery's "teacher reads student ..." policies), because Postgres
-- evaluates a table's RLS policies every time that table is touched, even
-- from inside another policy's subquery.
--
-- Fix: SECURITY DEFINER functions run as their owner, and table owners are
-- exempt from RLS by default (unless FORCE ROW LEVEL SECURITY is set, which
-- schema.sql never sets) — so a lookup done *inside* one of these functions
-- doesn't re-trigger the policy it's being called from. That breaks the loop
-- without changing who can see what.
--
-- Run this once in the Supabase SQL editor on the existing project.

create or replace function is_class_teacher(target_class_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from classes c where c.id = target_class_id and c.teacher_id = auth.uid());
$$;

create or replace function is_class_member(target_class_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from class_members cm where cm.class_id = target_class_id and cm.student_id = auth.uid());
$$;

drop policy if exists "members read class" on classes;
create policy "members read class" on classes for select using (is_class_member(classes.id));

drop policy if exists "teacher manages members" on class_members;
create policy "teacher manages members" on class_members for all
  using (is_class_teacher(class_members.class_id))
  with check (is_class_teacher(class_members.class_id));
