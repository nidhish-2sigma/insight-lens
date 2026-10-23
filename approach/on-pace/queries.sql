-- On pace projection: the data it reads, for one class.
--
-- Parameters
--   :section_id     the class (section.section_id), e.g. 218
--   :curriculum_id  the class's main textbook (section.curriculum_id, or the primary row of section_curriculum), e.g. 'csawesome2'
--
-- Rules for every session
--   * read only: run  SET default_transaction_read_only = on  first, with a statement timeout
--   * the password comes from the environment (PGPASSWORD), never from a file in this repository
--
-- Queries 1 to 7 are what the projection needs. tools/export-atlas.py already runs equivalents of them and writes data/class.js,
-- so the page can compute everything from that file. They are written out here so the method can be rebuilt on any class.
-- Queries 8 to 11 are optional or for reference: what was checked and why it is or is not used (see data-sources.md).
-- Graded question types (the only ones that can show a skill): mchoice, activecode, parsonsprob, parsonprob, fillintheblank, clickablearea, dragndrop.


-- 1. The students counted -------------------------------------------------------------------------------------------------
-- Why: a projection is one per student. Teachers, removed students and virtual (test) users are left out.
-- Uses: section_user.section_user_id (joins to assignment), role, ignore and deleted_at, and app_user.is_virtual.
select su.section_user_id, su.app_user_id
from section_user su
join app_user u using (app_user_id)
where su.section_id = :section_id
  and su.role = 'student'
  and coalesce(su.ignore, false) = false
  and su.deleted_at is null
  and not u.is_virtual
order by su.section_user_id;


-- 2. The textbook's units and lessons, in book order ----------------------------------------------------------------------
-- Why: the goal is a target unit. Its lessons say which skills the unit is for, and book order says what comes earlier.
-- Uses: unit.level (1 = unit, 2 = lesson), unit.parent_id (a lesson's unit), curriculum_unit_order.ordering (book order),
--       display_id (the "2.3" a teacher sees), hidden and ignore (left out of the book).
select u.unit_id, u.parent_id, u.level, o.display_id, coalesce(o.display_name, u.unit_name) as name, o.ordering
from unit u
join curriculum_unit_order o on o.unit_id = u.unit_id and o.curriculum_id = :curriculum_id
where u.source_curriculum_id = :curriculum_id
  and u.level in (1, 2)
  and coalesce(u.ignore, false) = false
  and coalesce(o.ignore, false) = false
  and coalesce(o.hidden, false) = false
order by u.level, o.ordering, u.unit_id;


-- 3. Each lesson's graded questions --------------------------------------------------------------------------------------
-- Why: a skill is "met" when a student first answers a question that checks it. The lesson a question sits in places it in the book.
-- Uses: curriculum_unit_item.unit_id (the lesson) and ordering, item.item_type (graded types only), and the outline's hidden and ignore flags.
select cui.unit_id as lesson_id, i.item_id, i.item_type::text as item_type, cui.ordering
from curriculum_unit_item cui
join item i using (item_id)
join curriculum_unit_order o on o.unit_id = cui.unit_id and o.curriculum_id = cui.curriculum_id   -- the lesson is in the book (query 2)
join unit u on u.unit_id = cui.unit_id
join curriculum_unit_order po on po.unit_id = u.parent_id and po.curriculum_id = cui.curriculum_id  -- and so is its unit
join unit pu on pu.unit_id = u.parent_id
where cui.curriculum_id = :curriculum_id
  and u.level = 2 and pu.level = 1
  and coalesce(po.ignore, false) = false and coalesce(po.hidden, false) = false and coalesce(pu.ignore, false) = false
  and coalesce(cui.ignore, false) = false
  and coalesce(i.ignore, false) = false
  and coalesce(o.ignore, false) = false
  and coalesce(o.hidden, false) = false
  and coalesce(u.ignore, false) = false
  and i.item_type::text in ('mchoice', 'activecode', 'parsonsprob', 'parsonprob', 'fillintheblank', 'clickablearea', 'dragndrop')
order by cui.unit_id, cui.ordering, i.item_id;


-- 4. Which skills each question checks ------------------------------------------------------------------------------------
-- Why: every count on the page is a count of skills. A question is evidence for the skills it is tagged with.
-- Uses: item_skill.skill_id, relevance_score (only tags above 0.5 count: the rule the whole mock uses), ignore,
--       skill.title (the name shown), skill.skill_set_id (the book's skill set).
select s.item_id, s.skill_id, s.relevance_score, s.dok, coalesce(nullif(k.title, ''), left(k.description, 60)) as skill_name
from item_skill s
join skill k on k.skill_id = s.skill_id
where s.item_id in (select cui.item_id from curriculum_unit_item cui where cui.curriculum_id = :curriculum_id and coalesce(cui.ignore, false) = false)
  and coalesce(s.ignore, false) = false
  and s.relevance_score > 0.5;


-- 5. What each lesson teaches and assesses --------------------------------------------------------------------------------
-- Why: the goal's skill list. A unit's key skills are the ones its own summary, test, exercise and practice lessons check and that
--      later units carry forward. The "earlier skills used" are the ones earlier units teach that the target unit's lessons use.
--      This is the only record of where a skill is taught: there is no "introduced in" field.
-- Uses: unit_skill_coverage.teach_weight (above 0 means the lesson teaches it) and assess_weight. The weights are relative, not percentages.
select c.unit_id as lesson_id, c.skill_id, c.teach_weight, c.assess_weight
from unit_skill_coverage c
join curriculum_unit_order o on o.unit_id = c.unit_id and o.curriculum_id = :curriculum_id
where coalesce(o.ignore, false) = false;


-- 6. Every student's result on every graded question: the evidence ------------------------------------------------------------
-- Why: the levels, the "met" day, the first-week rate and the class's pace all come from this, and only from this.
--      Only questions in the textbook's lessons count (11,002 student-question rows on section 218, the same as data/class.js).
--      Answers to questions outside the book are left out (1,474 more rows on section 218).
-- Uses: interaction_summary.action ('check' and 'code_run' are answers: opens and hints are not), correct, timestamp (UTC: the
--       export shifts it to the class's local day), item_type and ignore. assignment.section_user_id ties an answer to a student.
-- Credit (in the app, not here): a quick question earns 1 when right on the first try and 0.5 on the second. A code or Parsons
-- task earns 1 when right within three tries and 0.5 within six. Anything else earns 0.
with students as (
  select su.section_user_id
  from section_user su join app_user u using (app_user_id)
  where su.section_id = :section_id and su.role = 'student' and coalesce(su.ignore, false) = false and su.deleted_at is null and not u.is_virtual
), book as materialized (                                               -- the questions in the textbook's lessons, as in query 3
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
  select a.section_user_id, s.item_id, s.item_type::text as item_type, s.correct, s.timestamp,
         row_number() over (partition by a.section_user_id, s.item_id order by s.timestamp, s.interaction_summary_id) as try_no
  from interaction_summary s
  join assignment a using (assignment_id)
  join students using (section_user_id)
  where s.action in ('check', 'code_run')
    and coalesce(s.ignore, false) = false
    and coalesce(a.ignore, false) = false
    and s.item_type::text in ('mchoice', 'activecode', 'parsonsprob', 'parsonprob', 'fillintheblank', 'clickablearea', 'dragndrop')
)
select section_user_id, item_id, min(item_type) as item_type,
       min(timestamp) as first_check,                                       -- the day the student met this question
       count(*) as tries,
       coalesce(min(try_no) filter (where correct), 0) as first_right_try,   -- 0 = never right, and it sets the credit
       coalesce(bool_or(correct), false) as ever_right,
       max(timestamp) as last_check
from answers
where item_id in (select item_id from book)                              -- filter whole questions, after numbering the tries
group by section_user_id, item_id;


-- 7. Answers in practice sets the teacher targeted -----------------------------------------------------------------------------
-- Why: a retry 14 days or more after the first try counts as one more check. Checks 21 days or more after the student first met
--      the skill weigh 60% of its score, so a late retry can change a level.
-- Uses: coursework.coursework_type (the textbook's own lessons are 'self_guided_practice' and are already in query 6),
--       coursework_item (the set's questions), assignment and interaction_summary as in query 6.
with students as (
  select su.section_user_id
  from section_user su join app_user u using (app_user_id)
  where su.section_id = :section_id and su.role = 'student' and coalesce(su.ignore, false) = false and su.deleted_at is null and not u.is_virtual
)
select ci.coursework_id, a.section_user_id, s.item_id, min(s.timestamp) as first_check,
       coalesce((array_agg(s.correct order by s.timestamp))[1], false) as right_first, coalesce(bool_or(s.correct), false) as ever_right
from coursework c
join coursework_item ci using (coursework_id)
join assignment a using (coursework_item_id)
join students using (section_user_id)
join interaction_summary s using (assignment_id)
where c.section_id = :section_id
  and c.coursework_type::text <> 'self_guided_practice'
  and coalesce(c.ignore, false) = false
  and s.action in ('check', 'code_run')
  and coalesce(s.ignore, false) = false
group by 1, 2, 3;


-- 8. Optional: how hard each question is across every class (a prior for skills the class has not met yet) ----------------------
-- Why: a skill whose questions most students get right first time is mastered more often in its first week (r = 0.39 on this class).
--      Not in the proposal: it adds little, and its numbers include later data (see evaluation.md).
-- Uses: item_metrics.p_first (share right on the first try), n_assignments (how many answers it rests on).
select m.item_id, m.p_first, m.p_eventual, m.difficulty_score, m.n_assignments
from item_metrics m
where m.item_id in (select cui.item_id from curriculum_unit_item cui where cui.curriculum_id = :curriculum_id and coalesce(cui.ignore, false) = false)
  and m.n_assignments >= 20;


-- 9. Optional: dates the teacher set on lessons (a hint of the plan) --------------------------------------------------------------
-- Why: the plan what-if needs to know when the class will reach the rest of the unit. Due dates set ahead would say so.
--      On section 218 only 20 of 287 lessons have one, each released 1 to 7 days before it fell due, and every row was last changed
--      after the term (May or September 2026), so the database cannot say how far ahead they were set. The teacher's goal date is the
--      plan the page uses.
-- Uses: coursework.unit_id (the lesson), release_date, due_date.
select c.unit_id as lesson_id, c.release_date, c.due_date, c.coursework_type::text as coursework_type
from coursework c
where c.section_id = :section_id
  and coalesce(c.ignore, false) = false
  and c.due_date is not null
order by c.due_date;


-- 10. Reference: the learner model's own level cut-offs for the book's skill set -------------------------------------------------
-- Why: if On pace is later read off the learner model's scores, "mastered" there is a score at or above the fourth cut
--      (version 2 for skill set 19: 39, 52, 61, 69). The page today uses ALPS's fixed cuts on its own score (40, 55, 65, 80).
-- Uses: learner_model_config.key ('levels.perf.<skill_set_id>'), value->'perf', version.
select key, version, value -> 'perf' as cuts, value -> 'population' -> 'shares' as shares, updatedon
from learner_model_config
where key = 'levels.perf.' || (select cs.skill_set_id::text from curriculum_skill_set cs where cs.curriculum_id = :curriculum_id and coalesce(cs.ignore, false) = false limit 1)
order by version;


-- 11. Reference: the learner model's latest score per student and skill, and how many cut-offs the table holds ----------------------
-- Why not used: for section 218 the table holds one cut-off (6 Feb 2026), so it gives no history to project from, and its scores do
--      not separate the skills a student has mastered from the ones they have not (see data-sources.md). Check this again per class.
with students as (
  select su.app_user_id from section_user su
  where su.section_id = :section_id and su.role = 'student' and coalesce(su.ignore, false) = false and su.deleted_at is null
)
select count(*) as scores, count(distinct p.data_cutoff) as cutoffs, min(p.data_cutoff) as first_cutoff, max(p.data_cutoff) as last_cutoff,
       percentile_cont(array[.1, .5, .9]) within group (order by p.performance_score) as score_p10_p50_p90
from student_performance_predictions p
join students using (app_user_id)
where coalesce(p.ignore, false) = false;
