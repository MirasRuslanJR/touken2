-- Adds: student's school on their profile, and a pending/approved/rejected
-- status on class_members so joining a class needs a teacher's OK instead of
-- being instant. Run this once in the Supabase SQL editor on the existing
-- project. schema.sql already has both for any future fresh setup.

alter table profiles add column if not exists school text;

-- Added nullable first on purpose: existing rows (inserted back when
-- "student joins class" had no approval gate at all) need to be grandfathered
-- in as already-approved, not silently defaulted to 'pending' and bumped out
-- of the teacher's roster the moment this migration runs.
alter table class_members add column if not exists status text;
update class_members set status = 'approved' where status is null;
alter table class_members alter column status set default 'pending';
alter table class_members alter column status set not null;
alter table class_members drop constraint if exists class_members_status_check;
alter table class_members add constraint class_members_status_check check (status in ('pending','approved','rejected'));

-- A pending request lets the teacher see the request itself (listPendingMembers
-- reads class_members directly), not the student's actual profile/attempts/
-- mastery before the teacher has accepted them.
drop policy if exists "teacher reads class students" on profiles;
create policy "teacher reads class students" on profiles for select using (
  exists (
    select 1 from class_members cm join classes c on c.id = cm.class_id
    where cm.student_id = profiles.id and c.teacher_id = auth.uid() and cm.status = 'approved'
  )
);

drop policy if exists "teacher reads student attempts" on attempts;
create policy "teacher reads student attempts" on attempts for select using (
  exists (select 1 from class_members cm join classes c on c.id = cm.class_id where cm.student_id = attempts.user_id and c.teacher_id = auth.uid() and cm.status = 'approved')
);

drop policy if exists "teacher reads student mastery" on mastery;
create policy "teacher reads student mastery" on mastery for select using (
  exists (select 1 from class_members cm join classes c on c.id = cm.class_id where cm.student_id = mastery.user_id and c.teacher_id = auth.uid() and cm.status = 'approved')
);
