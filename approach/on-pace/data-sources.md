# Data sources: what the database holds, and which fields the projection uses

All figures below were read from the anonymised database on 23 October 2026, for **section 218**: the 36-student AP Computer Science A class the mock uses, on the textbook CS Awesome 2.0 (`csawesome2`, skill set 19, "Java Programming 2"). The class answered questions from 3 Sep 2025 to 6 Feb 2026 (UTC).

## How to read the database

- Postgres database `anonymized-prod`, through the Cloud SQL proxy on `127.0.0.1:5434`, user `postgres`, the same as `tools/export-atlas.py`.
- The password comes from the environment (`PGPASSWORD`) for one command. It is never written into a file in this repository.
- Every session is read-only: `SET default_transaction_read_only = on`, with a statement timeout.
- The SQL for every input is in [queries.sql](queries.sql). Each query has been run on section 218, and its counts match `data/class.js`.

## The short version

| Need | Where it comes from | Rows for section 218 |
|---|---|---|
| Who the students are | `section_user`, `app_user` | 36 students |
| The book's units and lessons, in order | `curriculum_unit_order`, `unit` | 13 units, 230 lessons |
| Each lesson's graded questions | `curriculum_unit_item`, `item` | 1,503 questions |
| Which skills each question checks | `item_skill`, `skill` | 8,502 tags above 0.5 relevance, on 1,305 skills |
| What each lesson teaches (the goal's skill list) | `unit_skill_coverage` | 7,036 lesson-skill weights |
| Every answer, its result and its date | `interaction_summary`, `assignment` | 32,926 answers, 11,002 student-question results in the book |
| Retries in practice sets the teacher targeted | `coursework`, `coursework_item` (+ the two above) | 392 answer rows, 1 set used |

Everything the method computes (levels, the "met" day, the class's pace, each student's rates) comes from these tables and nothing else.

## Tables the projection uses, field by field

### `section`: the class
- `section_id`: the class. Every query is for one section.
- `curriculum_id`: the class's main textbook. It decides which book's outline and tags are read.
- `term_start`, `term_end`: checked, and **empty** for this class. If a school filled them, they would bound the schedule (no projection past the end of term). Today the page cannot know when term ends.

### `section_curriculum`: the books a class lists
- `curriculum_id`, `role` (`primary` or `supplemental`), `ordering`: a class can list several books. The main book sets the goal and the schedule, and a skill's evidence comes from every book. Section 218 lists one.

### `section_user` and `app_user`: the students
- `section_user_id`: one projection per student. It joins to `assignment`, which ties every answer to a student.
- `role = 'student'`, `ignore`, `deleted_at`, `app_user.is_virtual`: these leave out the teacher, removed students and test users. Section 218 has 36 students and 1 teacher.
- `app_user_id`: only needed to compare with the learner model's tables, which are keyed by it.

### `curriculum_unit_order` and `unit`: the outline of the book
- `unit.level`: 1 is a unit (the goal a teacher picks), 2 is a lesson (what the questions sit in).
- `unit.parent_id`: a lesson's unit.
- `curriculum_unit_order.ordering`: book order. "Earlier skills used" means skills taught in units before the target, so order matters.
- `display_id`: the "2.3" a teacher sees.
- `hidden`, `ignore`: parts left out of the book are left out of the goal.

### `curriculum_unit_item` and `item`: the questions in each lesson
- `curriculum_unit_item.unit_id` and `ordering`: which lesson a question is in, and where.
- `item.item_type`: only graded types can show what a student knows (`mchoice`, `activecode`, `parsonsprob`, `parsonprob`, `fillintheblank`, `clickablearea`, `dragndrop`). Readings and videos are not evidence.
- `item.ignore`: removed questions are left out.

### `item_skill` and `skill`: which skills a question checks
- `item_skill.skill_id`: every count on the page is a count of skills, and a question is evidence only for the skills it is tagged with.
- `relevance_score`: only tags **above 0.5** count. It is the only relevance score in the database (0.25, 0.5, 0.75 or 1), and the cut is the rule the whole mock uses. On this book 8,502 of 8,503 tags pass.
- `ignore`: dropped tags are left out.
- `dok` (depth of knowledge): read but **not used**. Nothing showed it would change a count of skills mastered.
- `skill.title` (or the start of `description`): the skill's name on the page.
- `skill.skill_set_id`: ties the skills to the book's skill set (19), which the learner model's tables use.

### `unit_skill_coverage`: what each lesson teaches and assesses
- `teach_weight`: above 0 means the lesson teaches the skill (3,478 rows on this book). It says which skills each unit introduces, which builds the goal: the target unit's key skills, plus the earlier skills its lessons use.
- `assess_weight`: above 0 means the lesson assesses the skill (4,956 rows). A unit's key skills are the ones its own summary, test, exercise and practice lessons check.
- The weights are relative (0 to about 8), not percentages. This table is the only record of where a skill is taught: there is no "introduced in" field.

### `interaction_summary` and `assignment`: every answer
This is the evidence. Everything that moves in the projection comes from it.
- `assignment.section_user_id`: whose answer it is.
- `interaction_summary.item_id`: which question was answered, and through `item_skill`, which skills it checks.
- `action`: only `check` (a quick question) and `code_run` (a code task) are answers. They are all this table holds for the class.
- `correct`: right or not, try by try. The credit comes from the try that was first right: a quick question earns 1 on the first try and 0.5 on the second; a code or Parsons task earns 1 within three tries and 0.5 within six.
- `timestamp`: when. Its first value per student and question is the day the student **met** that question's skills, and the dates drive the class's pace. Stored in UTC; the export shifts it to the class's local day.
- `interaction_summary_id`: breaks ties between answers in the same second, so tries number the same way every run.
- `item_type`, `ignore`, `assignment.ignore`: graded answers only, and nothing marked as ignored.
- Answers to questions outside the book's lessons are left out: 11,002 student-question results count, and 1,474 more are outside.

### `coursework` and `coursework_item`: practice sets the teacher targeted
- `coursework.coursework_type`: anything but `self_guided_practice` (the textbook's own lessons, already counted) is a set the teacher made.
- With `coursework_item` and `assignment`, the answers in those sets. A retry 14 days or more after the student's first try on the question counts as one more check. Checks 21 days or more after the student first met the skill weigh 60% of its score, so a late retry can lift or lower a level. Section 218 has one such set with three or more students in it.

## Optional, and for reference

### `item_metrics`: how hard each question is, across every class
- `p_first` (the share right on the first try), with `n_assignments` of 20 or more. 464 of the book's questions qualify, covering 70 of the 100 skills in any goal.
- **Why it could help:** a skill whose questions most students get right first time is mastered more often in its first week. Across 63 skills on this class the correlation is 0.39. That makes it a prior for skills the class has not met yet.
- **Why it is not in the proposal:** it changed the test's error by about 0.03 skills, and its numbers are computed across all classes and include later data, which flatters it in a test of the past.

### `learner_model_config`: the learner model's own level cut-offs
- `key = 'levels.perf.19'`, `value -> 'perf'`. Version 2 (23 Sep 2026) puts the cuts at 39, 52, 61 and 69, derived from the score quantiles of 728,906 student-skill cells in 40 classes, this one among them. On those cuts 16.7% of cells count as mastered.
- **Why it matters:** if On pace ever reads "mastered" off the learner model's scores, mastered is a score of 69 or more. The page today uses ALPS's fixed cuts (40, 55, 65, 80) on its own score.

## Tables checked and not used, and why

| Table | What it holds for section 218 | Why it is not used |
|---|---|---|
| `student_performance_predictions` and `student_performance_history` | 12,211 scores each (36 students, 631 skills), all from **one** cut-off, 6 Feb 2026 | No history, so nothing to learn a rate from. Worse, the scores do not tell a student's mastered skills from their weak ones (below). |
| `learner_model` | 876 runs of the learner model (glmnet, performance), 17 Sep 2025 to 23 Sep 2026, on data up to 6 Feb 2026 | Each run's skill predictions were written as files in the learner model's storage bucket, not into the database. Read from there, they would give a history; that was not done. |
| `student_engagement_history`, `student_engagement_predictions` | 35,369 and 35,951 rows, 3 Sep to 18 Dec 2025 | Engagement (ALPS's percentile of time and attempts) is not mastery. |
| `student_skill_progress`, `student_curriculum_unit_progress` | **0 rows** | Empty for this class. |
| `student_curriculum_progress` | 1,341 rows (37 people, 81 units), all dated 21 Oct 2026 | One snapshot of how much of each unit is done. No history, and the answers already say what each student has done. |
| `section_unit_visibility` | **0 rows** | The teacher has hidden or shown nothing, so it is no plan. |
| `section.term_start`, `term_end`, `term_name` | Empty | No term dates to bound the schedule. |
| `coursework.release_date`, `due_date` on lessons | 287 lesson rows, 231 of them created on 14 Aug 2025 when the class was set up. Only 20 have dates (released 12 Oct to 17 Nov, due 16 Oct to 20 Nov, 1 to 7 days apart). Every row was last changed after the term (7 May or 12 Sep 2026). | Short assignment windows set as the class went, not a plan ahead. And because every row changed after the term, the database cannot say when the dates were set. |
| `student_activity_hour`, `student_item_activity_hour` | Active minutes and attempts per hour | Not needed: first-answer dates already say when the class worked. Could mark breaks later. |
| `knowledge_graph`, `skill_graph` | Pointers to the prerequisite graph file | Prerequisites do not change a count of skills mastered. Ready for a unit uses them. |
| `class_analytics_*`, `assignment_status` | Build state of analytics snapshots, and per-assignment status and time | No skill-level learning data beyond what the answers hold. |

### The learner model's scores, checked against the page

Compared on 6 Feb 2026, the day of the stored cut-off, with the page's own score on the same day. A score is matched to the class file's skill by its title.

- **The class's 12,211 scores are bunched:** 10th to 90th percentile 0.42 to 0.59, median 0.49. Only **0.4%** reach the model's own mastered cut (0.69), against 16.7% in the population the cut was derived from.
- **They do not follow the evidence.** Over the 6,368 matched student-skill pairs, the median score is 0.48 to 0.49 at every level the page gives, from beginning to mastered. The rank agreement with the page's own score, on the 3,584 pairs with two or more checks, is **0.07** (0 would be none, 1 perfect).
- **They disagree on what is mastered.** On the 100 skills in any On pace goal, of 2,303 student-skill pairs with a score, the page calls 885 mastered and the model 9. Agreement beyond chance (kappa) is 0.01.
- **Not the cause:** `ttl_30` in the model's path is `training_time_limit` in the learner model's code, not an expiry on old answers.
- **So:** do not read "mastered now" from these scores for this class. Check them again per class before any future switch.

## How the data was checked

- Each query in [queries.sql](queries.sql) was run on section 218. Students (36), graded questions (1,503) and student-question results (11,002) match `data/class.js` exactly.
- The comparisons above use the page's own code (`js/atlas.js`) on `data/class.js`, as of 6 Feb 2026.
