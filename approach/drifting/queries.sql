-- Drifting: the data it reads, and the whole calculation, for one class.
--
-- Parameters
--   :section_id     the class (section.section_id), e.g. 218
--   :curriculum_id  the class's main textbook (section.curriculum_id, or the primary row of section_curriculum), e.g. 'csawesome2'
--   :utc_offset     hours to add to the database's UTC times to get the class's local time, from query 2, e.g. -4
--   :as_of          the day to judge, a local date, e.g. '2025-11-15': the page's "today" (the export date, or the day picked under "As of")
--
-- Rules for every session
--   * read only: run  SET default_transaction_read_only = on  first, with a statement timeout
--   * the password comes from the environment (PGPASSWORD), never from a file in this repository
--
-- Queries 1 to 3 are the inputs. tools/export-atlas.py already runs equivalents of them and writes data/class.js, so the page can
-- compute everything from that file. Query 4 is the whole calculation in SQL, for one day: who is drifting and since when, who is
-- working less, and the class's own state. Query 5 is the line drawn beside each row. Queries 6 to 8 are the three signals beside a
-- row. Query 9 is for reference: the columns and types of every table read here.
-- Graded question types (the only answers that count as work here): mchoice, activecode, parsonsprob, parsonprob, fillintheblank, clickablearea, dragndrop.
-- Five-day blocks count back from :as_of: block 0 is the last five days (:as_of and the four days before), block 1 the five before that, and so on.


-- 1. The students counted -------------------------------------------------------------------------------------------------
-- Why: each student is judged against their own normal. Teachers, removed students and virtual (test) users are left out.
-- Uses: section_user.section_user_id (joins to assignment and the activity tables), role, ignore and deleted_at, and app_user.is_virtual.
select su.section_user_id, su.app_user_id
from section_user su
join app_user u using (app_user_id)
where su.section_id = :section_id
  and su.role = 'student'
  and coalesce(su.ignore, false) = false
  and su.deleted_at is null
  and not u.is_virtual
order by su.section_user_id;


-- 2. The class's local time --------------------------------------------------------------------------------------------------
-- Why: a "day" is the class's day, not a UTC day. The database stores UTC and no time zone, so the export reads the offset off the
--      class's own activity: the quietest six hours of the day are taken to start at 1 am local. Section 218 gives -4.
-- Uses: student_activity_hour.hour_start (UTC, the start of each hour) and items (questions and pages touched in it).
with hours as (
  select extract(hour from h.hour_start)::int as hr, sum(h.items) as items
  from student_activity_hour h
  where h.section_id = :section_id
  group by 1
), windows as (                                                       -- six hours starting at each hour of the day
  select s.hr as quiet_start, sum(coalesce(h.items, 0)) as items
  from generate_series(0, 23) as s(hr)
  cross join generate_series(0, 5) as k(k)
  left join hours h on h.hr = (s.hr + k.k) % 24
  group by s.hr
)
select quiet_start, ((1 - quiet_start + 12) % 24 + 24) % 24 - 12 as utc_offset
from windows
order by items, quiet_start
limit 1;


-- 3. Each student's first try on each graded question, as a local day ---------------------------------------------------------------
-- Why: a student's work in five days is the questions they first tried in them, on any unit of the book. A retry is not new work,
--      and nor is a page opened or a video watched. This is the only input the drifting calculation needs (query 4 repeats it).
--      On section 218 it gives 11,002 rows, the same as data/class.js (att, its "first day").
-- Uses: interaction_summary.action ('check' and 'code_run' are answers), timestamp (UTC), item_type and ignore; assignment.section_user_id
--       and ignore; and the book's outline (curriculum_unit_item, curriculum_unit_order, unit), so only questions in the book's lessons count.
with students as (
  select su.section_user_id
  from section_user su join app_user u using (app_user_id)
  where su.section_id = :section_id and su.role = 'student' and coalesce(su.ignore, false) = false and su.deleted_at is null and not u.is_virtual
), book as (                                                          -- the questions in the textbook's lessons
  select cui.item_id
  from curriculum_unit_item cui
  join curriculum_unit_order o on o.unit_id = cui.unit_id and o.curriculum_id = cui.curriculum_id
  join unit u on u.unit_id = cui.unit_id
  join curriculum_unit_order po on po.unit_id = u.parent_id and po.curriculum_id = cui.curriculum_id
  join unit pu on pu.unit_id = u.parent_id
  where cui.curriculum_id = :curriculum_id and u.level = 2 and pu.level = 1
    and coalesce(cui.ignore, false) = false and coalesce(o.ignore, false) = false and coalesce(o.hidden, false) = false and coalesce(u.ignore, false) = false
    and coalesce(po.ignore, false) = false and coalesce(po.hidden, false) = false and coalesce(pu.ignore, false) = false
)
select a.section_user_id, s.item_id, (min(s.timestamp) + :utc_offset * interval '1 hour')::date as first_day
from interaction_summary s
join assignment a using (assignment_id)
join students using (section_user_id)
where s.action in ('check', 'code_run')
  and coalesce(s.ignore, false) = false
  and coalesce(a.ignore, false) = false
  and s.item_type::text in ('mchoice', 'activecode', 'parsonsprob', 'parsonprob', 'fillintheblank', 'clickablearea', 'dragndrop')
  and s.item_id in (select item_id from book)
group by a.section_user_id, s.item_id;


-- 4. Who is drifting, and since when: the whole calculation for one day ----------------------------------------------------------
-- Why: this is the page's rule (method.md), step by step:
--      work     the questions each student first tried in each five-day block, counted back from :as_of
--      breaks   a block in which nobody in the class tried a question is a break: it is left out, and never counts against anyone
--      normal   the middle (lower median) of the student's earlier blocks with class work, the latest two left out; three or more needed
--      low      under half their normal
--      guard    nobody is judged when nobody in the class worked in the last five days, or when half or more of the students with a
--               normal are low: then the class as a whole has stopped or slowed, and the page says so instead
--      drifting low in the last five days and in the block with class work before them; "since" is the first day of the run of low
--               blocks that reaches today. Low in the last five days only is "working less".
-- Returns one row per student. The class's own state is on every row (class_*), so one query answers the whole page.
with students as (
  select su.section_user_id
  from section_user su join app_user u using (app_user_id)
  where su.section_id = :section_id and su.role = 'student' and coalesce(su.ignore, false) = false and su.deleted_at is null and not u.is_virtual
), book as (
  select cui.item_id
  from curriculum_unit_item cui
  join curriculum_unit_order o on o.unit_id = cui.unit_id and o.curriculum_id = cui.curriculum_id
  join unit u on u.unit_id = cui.unit_id
  join curriculum_unit_order po on po.unit_id = u.parent_id and po.curriculum_id = cui.curriculum_id
  join unit pu on pu.unit_id = u.parent_id
  where cui.curriculum_id = :curriculum_id and u.level = 2 and pu.level = 1
    and coalesce(cui.ignore, false) = false and coalesce(o.ignore, false) = false and coalesce(o.hidden, false) = false and coalesce(u.ignore, false) = false
    and coalesce(po.ignore, false) = false and coalesce(po.hidden, false) = false and coalesce(pu.ignore, false) = false
), first_tries as (                                                   -- query 3
  select a.section_user_id, s.item_id, (min(s.timestamp) + :utc_offset * interval '1 hour')::date as first_day
  from interaction_summary s
  join assignment a using (assignment_id)
  join students using (section_user_id)
  where s.action in ('check', 'code_run') and coalesce(s.ignore, false) = false and coalesce(a.ignore, false) = false
    and s.item_type::text in ('mchoice', 'activecode', 'parsonsprob', 'parsonprob', 'fillintheblank', 'clickablearea', 'dragndrop')
    and s.item_id in (select item_id from book)
  group by a.section_user_id, s.item_id
), work as (                                                          -- questions first tried per student and block (block 0 = the last five days)
  select section_user_id, floor((:as_of::date - first_day) / 5.0)::int as block, count(*) as n
  from first_tries
  where first_day <= :as_of::date
  group by 1, 2
), live as (                                                          -- blocks in which anyone in the class worked; the rest are breaks
  select block, sum(n) as class_n from work group by block
), grid as (                                                          -- every student in every live block, 0 when they tried nothing
  select s.section_user_id, l.block, coalesce(w.n, 0) as n
  from students s
  cross join live l
  left join work w on w.section_user_id = s.section_user_id and w.block = l.block
), normal as (                                                        -- the lower median of the earlier live blocks, the latest two left out
  select section_user_id, percentile_disc(0.5) within group (order by n) as normal
  from grid
  where block >= 2
  group by section_user_id
  having count(*) >= 3
), low as (
  select g.section_user_id, g.block, g.n, g.n < nm.normal / 2.0 as is_low
  from grid g join normal nm using (section_user_id)
), class_now as (
  select exists (select 1 from live where block = 0) as working,
         (select count(*) from normal) as judged,
         (select count(*) from low where block = 0 and is_low) as low_now,
         (select coalesce(sum(class_n), 0) from live where block = 0) as class_last_five_days,
         (select percentile_disc(0.5) within group (order by class_n) from live where block >= 2) as class_usual,
         (select max(first_day) from first_tries where first_day <= :as_of::date) as class_last_work,
         (select date_trunc('week', min(first_day))::date from first_tries) as day0          -- the Monday of the first week of work
), run as (                                                           -- the run of low live blocks that reaches the last five days
  select l.section_user_id, count(*) as blocks, max(l.block) as oldest
  from low l
  where l.is_low
    and l.block < coalesce((select min(x.block) from low x where x.section_user_id = l.section_user_id and not x.is_low), 2147483647)
  group by l.section_user_id
  having min(l.block) = 0
)
select s.section_user_id,
       nm.normal,
       coalesce(g0.n, 0) as last_five_days,
       case when not c.working then 'not judged: nobody in the class worked in the last five days'
            when nm.normal is null then 'not judged: too few earlier blocks with class work'
            when c.low_now >= c.judged / 2.0 then 'not judged: the class as a whole slowed'
            when r.blocks >= 2 then 'drifting'
            when r.blocks = 1 then 'working less'
            else 'normal' end as status,
       case when c.working and c.low_now < c.judged / 2.0 and r.blocks >= 2
            then greatest(:as_of::date - (5 * r.oldest + 4), c.day0) end as drifting_since,
       c.judged as class_judged, c.low_now as class_low_now, c.class_last_five_days, c.class_usual, c.class_last_work
from students s
cross join class_now c
left join normal nm on nm.section_user_id = s.section_user_id
left join grid g0 on g0.section_user_id = s.section_user_id and g0.block = 0
left join run r on r.section_user_id = s.section_user_id
order by status, drifting_since, s.section_user_id;


-- 5. The line beside each row ------------------------------------------------------------------------------------------------------
-- Why: the page draws each student's questions per five days against their normal range (a band from half of normal to one and a half
--      times it), with the breaks hatched. One row per student and block, oldest first; class_n = 0 marks a break.
-- Uses: query 3's first tries, and the students of query 1.
with students as (
  select su.section_user_id
  from section_user su join app_user u using (app_user_id)
  where su.section_id = :section_id and su.role = 'student' and coalesce(su.ignore, false) = false and su.deleted_at is null and not u.is_virtual
), book as (
  select cui.item_id
  from curriculum_unit_item cui
  join curriculum_unit_order o on o.unit_id = cui.unit_id and o.curriculum_id = cui.curriculum_id
  join unit u on u.unit_id = cui.unit_id
  join curriculum_unit_order po on po.unit_id = u.parent_id and po.curriculum_id = cui.curriculum_id
  join unit pu on pu.unit_id = u.parent_id
  where cui.curriculum_id = :curriculum_id and u.level = 2 and pu.level = 1
    and coalesce(cui.ignore, false) = false and coalesce(o.ignore, false) = false and coalesce(o.hidden, false) = false and coalesce(u.ignore, false) = false
    and coalesce(po.ignore, false) = false and coalesce(po.hidden, false) = false and coalesce(pu.ignore, false) = false
), first_tries as (
  select a.section_user_id, s.item_id, (min(s.timestamp) + :utc_offset * interval '1 hour')::date as first_day
  from interaction_summary s
  join assignment a using (assignment_id)
  join students using (section_user_id)
  where s.action in ('check', 'code_run') and coalesce(s.ignore, false) = false and coalesce(a.ignore, false) = false
    and s.item_type::text in ('mchoice', 'activecode', 'parsonsprob', 'parsonprob', 'fillintheblank', 'clickablearea', 'dragndrop')
    and s.item_id in (select item_id from book)
  group by a.section_user_id, s.item_id
), work as (
  select section_user_id, floor((:as_of::date - first_day) / 5.0)::int as block, count(*) as n
  from first_tries where first_day <= :as_of::date
  group by 1, 2
), start as (                                                         -- the Monday of the first week of work
  select date_trunc('week', min(first_day))::date as day0 from first_tries
), blocks as (                                                        -- every block from that week to the last five days
  select b.block, sum(w.n) as class_n
  from generate_series(0, (select floor((:as_of::date - day0) / 5.0)::int from start)) as b(block)
  left join work w on w.block = b.block
  group by b.block
)
select s.section_user_id, b.block,
       greatest(:as_of::date - (5 * b.block + 4)::int, st.day0) as block_start, :as_of::date - (5 * b.block)::int as block_end,
       coalesce(w.n, 0) as n, coalesce(b.class_n, 0) as class_n
from students s
cross join start st
cross join blocks b
left join work w on w.section_user_id = s.section_user_id and w.block = b.block
order by s.section_user_id, b.block desc;


-- 6. Signal: days with no work in the last five days -------------------------------------------------------------------------------
-- Why: attendance is not recorded. A day with no activity at all (no question touched, no graded attempt) is the nearest thing.
--      The page shows it when it is 2 or more of the 5. See evaluation.md: on this class that is true of three classmates in four.
-- Uses: student_activity_hour.hour_start (UTC), items and graded_attempts, per student, summed per local day.
with students as (
  select su.section_user_id
  from section_user su join app_user u using (app_user_id)
  where su.section_id = :section_id and su.role = 'student' and coalesce(su.ignore, false) = false and su.deleted_at is null and not u.is_virtual
), active as (                                                        -- the local days on which each student did anything
  select h.section_user_id, (h.hour_start + :utc_offset * interval '1 hour')::date as day
  from student_activity_hour h
  join students using (section_user_id)
  where h.section_id = :section_id
  group by 1, 2
  having sum(h.items) > 0 or sum(h.graded_attempts) > 0
), days as (
  select :as_of::date - k::int as day from generate_series(0, 4) as g(k)
)
select s.section_user_id, count(*) filter (where a.day is null) as days_without_work, count(*) as of_days
from students s
cross join days d
left join active a on a.section_user_id = s.section_user_id and a.day = d.day
group by s.section_user_id
order by s.section_user_id;


-- 7. Signal: assigned sets due in the last 35 days and not finished ----------------------------------------------------------------
-- Why: a student who stops working usually leaves assigned work undone. The page shows it when it is 2 or more.
--      Rows with the same name and due day are one set, as in the export (section 218 has 21 sets with a due date, due 16 Oct to 10 Dec 2025).
-- Uses: coursework.due_date (UTC), visibility (published or released), coursework_name, ignore; coursework_status.status
--       ('completed', 'partially_graded', 'graded', 'returned' or 'feedback_seen' mean finished), section_user_id, ignore.
with students as (
  select su.section_user_id
  from section_user su join app_user u using (app_user_id)
  where su.section_id = :section_id and su.role = 'student' and coalesce(su.ignore, false) = false and su.deleted_at is null and not u.is_virtual
), assigned as (
  select c.coursework_id, trim(coalesce(c.coursework_name, '')) as name, (c.due_date + :utc_offset * interval '1 hour')::date as due_day
  from coursework c
  where c.section_id = :section_id
    and coalesce(c.ignore, false) = false
    and c.due_date is not null
    and c.visibility::text in ('published', 'released')
), due as (                                                           -- due in the 35 days up to the as-of day
  select * from assigned where due_day <= :as_of::date and due_day > :as_of::date - 35
), done as (
  select distinct d.name, d.due_day, cs.section_user_id
  from due d
  join coursework_status cs on cs.coursework_id = d.coursework_id
  where coalesce(cs.ignore, false) = false
    and cs.status::text in ('completed', 'partially_graded', 'graded', 'returned', 'feedback_seen')
)
select s.section_user_id, count(d.name) as sets_due, count(d.name) filter (where dn.section_user_id is null) as sets_unfinished
from students s
left join (select distinct name, due_day from due) d on true
left join done dn on dn.name = d.name and dn.due_day = d.due_day and dn.section_user_id = s.section_user_id
group by s.section_user_id
order by s.section_user_id;


-- 8. Signal: the change in accuracy over the last 30 days --------------------------------------------------------------------------
-- Why: a student who drifts may also be rushing. The average credit on the questions first tried in the last 30 days, against the
--      ones first tried before, in points; only when there are 5 or more of each. The page shows it when it is down 10 or more.
--      Credit: a quick question earns 1 when right on the first try and 0.5 on the second; a code or Parsons task earns 1 within three
--      tries and 0.5 within six. A question that 8 or more students tried and nobody ever got right has no working check, and is left out.
-- Uses: interaction_summary (answers, try by try, as in query 3) and the book's outline. Only tries made by the as-of day count.
with students as (
  select su.section_user_id
  from section_user su join app_user u using (app_user_id)
  where su.section_id = :section_id and su.role = 'student' and coalesce(su.ignore, false) = false and su.deleted_at is null and not u.is_virtual
), book as (
  select cui.item_id
  from curriculum_unit_item cui
  join curriculum_unit_order o on o.unit_id = cui.unit_id and o.curriculum_id = cui.curriculum_id
  join unit u on u.unit_id = cui.unit_id
  join curriculum_unit_order po on po.unit_id = u.parent_id and po.curriculum_id = cui.curriculum_id
  join unit pu on pu.unit_id = u.parent_id
  where cui.curriculum_id = :curriculum_id and u.level = 2 and pu.level = 1
    and coalesce(cui.ignore, false) = false and coalesce(o.ignore, false) = false and coalesce(o.hidden, false) = false and coalesce(u.ignore, false) = false
    and coalesce(po.ignore, false) = false and coalesce(po.hidden, false) = false and coalesce(pu.ignore, false) = false
), answers as (
  select a.section_user_id, s.item_id, s.item_type::text as item_type, s.correct, (s.timestamp + :utc_offset * interval '1 hour')::date as day,
         row_number() over (partition by a.section_user_id, s.item_id order by s.timestamp, s.interaction_summary_id) as try_no
  from interaction_summary s
  join assignment a using (assignment_id)
  join students using (section_user_id)
  where s.action in ('check', 'code_run') and coalesce(s.ignore, false) = false and coalesce(a.ignore, false) = false
    and s.item_type::text in ('mchoice', 'activecode', 'parsonsprob', 'parsonprob', 'fillintheblank', 'clickablearea', 'dragndrop')
), results as (                                                       -- one row per student and question, as of the day
  select section_user_id, item_id, min(item_type) as item_type, min(day) as first_day,
         coalesce(min(try_no) filter (where correct), 0) as first_right_try
  from answers
  where item_id in (select item_id from book) and day <= :as_of::date
  group by 1, 2
), working_checks as (
  select item_id from results group by item_id having count(*) < 8 or max(first_right_try) > 0
), credit as (
  select r.section_user_id, r.first_day,
         case when r.first_right_try = 0 then 0
              when r.item_type in ('mchoice', 'fillintheblank', 'clickablearea', 'dragndrop') then case r.first_right_try when 1 then 1 when 2 then 0.5 else 0 end
              else case when r.first_right_try <= 3 then 1 when r.first_right_try <= 6 then 0.5 else 0 end end as credit
  from results r
  join working_checks using (item_id)
), split as (
  select section_user_id,
         avg(credit) filter (where first_day > :as_of::date - 30) as recent, count(*) filter (where first_day > :as_of::date - 30) as n_recent,
         avg(credit) filter (where first_day <= :as_of::date - 30) as before, count(*) filter (where first_day <= :as_of::date - 30) as n_before
  from credit
  group by section_user_id
)
select s.section_user_id, coalesce(p.n_recent, 0) as questions_recent, coalesce(p.n_before, 0) as questions_before,
       case when p.n_recent >= 5 and p.n_before >= 5 then floor(100 * (p.recent - p.before) + 0.5)::int else 0 end as accuracy_change_points
from students s
left join split p using (section_user_id)
order by s.section_user_id;


-- 9. Reference: the columns and types of every table read here ---------------------------------------------------------------------
-- Why: schemas.md lists the columns these queries use. Run this to check them against the database before relying on the SQL.
select table_name, column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('section_user', 'app_user', 'assignment', 'interaction_summary', 'curriculum_unit_item', 'curriculum_unit_order', 'unit',
                     'student_activity_hour', 'coursework', 'coursework_status')
order by table_name, ordinal_position;
