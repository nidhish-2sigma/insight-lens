# Data sources: what the database holds, and which fields Drifting uses

The figures below are for **section 218**: the 36-student AP Computer Science A class the mock uses, on the textbook CS Awesome 2.0 (`csawesome2`). The class answered questions from 3 Sep 2025 to 5 Feb 2026 (local time). They come from `data/class.js`, which `tools/export-atlas.py` wrote from the anonymised database on 13 Oct 2026, and from the database check recorded in [../on-pace/data-sources.md](../on-pace/data-sources.md) (23 Oct 2026).

**The queries in [queries.sql](queries.sql) have not been run on the database yet.** They were checked against the export instead (see the last section). The section "What to expect on the database" says what they should return for section 218.

## How to read the database

- Postgres database `anonymized-prod`, through the Cloud SQL proxy on `127.0.0.1:5434`, user `postgres`, the same as `tools/export-atlas.py`.
- The password comes from the environment (`PGPASSWORD`) for one command. It is never written into a file in this repository.
- Every session is read-only: `SET default_transaction_read_only = on`, with a statement timeout.
- The queries take four parameters: `:section_id` (218), `:curriculum_id` (`'csawesome2'`), `:utc_offset` (−4, from query 2) and `:as_of` (a local date such as `'2025-11-15'`). With psql: `psql -v section_id=218 -v curriculum_id="'csawesome2'" -v utc_offset=-4 -v as_of="'2025-11-15'" -f queries.sql`. With `pg8000.native`, as the export does, run one query at a time with the same names as keyword arguments, and the text values without the quotes: `con.run(sql, section_id=218, curriculum_id='csawesome2', utc_offset=-4, as_of='2025-11-15')`.

## The short version

| Need | Where it comes from | Rows for section 218 |
|---|---|---|
| Who the students are | `section_user`, `app_user` | 36 students |
| Which questions count | `curriculum_unit_item`, `curriculum_unit_order`, `unit` (the book's lessons) | 1,503 graded questions |
| Every first try and its day | `interaction_summary`, `assignment` | 11,002 student-question first tries |
| The class's local time | `student_activity_hour` (which hours are quiet) | UTC −4 |
| The days a student did anything | `student_activity_hour` | 1,474 student-days, 3 Sep 2025 to 12 Apr 2026 |
| Assigned sets, and who finished them | `coursework`, `coursework_status` | 21 sets with a due date, 16 Oct to 10 Dec 2025; 666 of the 756 student-set pairs finished |

The rule itself (who is drifting, since when) needs only the first tries and the students. The other rows feed the local days and the three signals beside a row.

## Tables Drifting uses, field by field

### `section_user` and `app_user`: the students
- `section_user_id`: one row per student on the page. It joins to `assignment` (the answers) and to `student_activity_hour` and `coursework_status`.
- `role = 'student'`, `ignore`, `deleted_at`, `app_user.is_virtual`: these leave out the teacher, removed students and test users. Section 218 has 36 students and 1 teacher.
- `section_id`: the class.

### `interaction_summary` and `assignment`: every answer
This is the work. Everything the rule computes comes from it.
- `assignment.section_user_id`: whose answer it is. `assignment.ignore`: answers in an ignored assignment are left out.
- `interaction_summary.action`: only `check` (a quick question) and `code_run` (a code task) are answers. Opening a page is not.
- `item_type`: only graded types (`mchoice`, `activecode`, `parsonsprob`, `parsonprob`, `fillintheblank`, `clickablearea`, `dragndrop`).
- `timestamp`: when, in UTC. Its first value per student and question is the **first try**, and its local day places the try in a five-day block.
- `ignore`: ignored answers are left out.
- `item_id`: which question. Only questions in the book's lessons count (next table).
- For the accuracy signal only: `correct` and `interaction_summary_id` (to number the tries in order), as in On pace.
- Not used: `time_spent_ms`. Time on a question depends on its type (a code task takes several times as long as a quick question), and counting first tries needs no assumption about it.

### `curriculum_unit_item`, `curriculum_unit_order` and `unit`: which questions count
- The questions placed in the book's lessons (`unit.level = 2`) under the book's units (`level = 1`), with nothing hidden or ignored along the way. This is On pace's filter, unchanged.
- **Why**: the export reads only these questions, so the page and the SQL count the same work. Students also answered questions outside the book's lessons ([../on-pace/data-sources.md](../on-pace/data-sources.md)); those are left out.

### `student_activity_hour`: activity per student and hour
- `hour_start` (UTC) and `items`: summed over the whole class by hour of the day, they show when the class is quiet. The quietest six hours are taken to start at 1 am local, which gives the offset (query 2). The export does the same.
- `items` and `graded_attempts`, per `section_user_id`, summed per local day: a day with neither is a day without work, the first signal (query 6).
- `section_id`: the class.
- **Why not count work from this table**: it records activity hour by hour, not which question was new. First tries come from the answers themselves, so the work and the questions behind it come from one place. This table is kept for what only it has: whether a student did anything on a day, readings and videos included.
- The activity tables also hold active minutes per hour ([../on-pace/data-sources.md](../on-pace/data-sources.md)). They are not in the export, so this test could not try time as a measure of work.

### `coursework` and `coursework_status`: assigned sets
- `coursework.due_date` (UTC), `visibility` (`published` or `released`), `ignore`, `section_id`: the sets assigned to the class with a due date. Section 218 has 21: 20 of the book's lessons, due 16 Oct to 20 Nov 2025, and one practice set ("Unit 4A - Array Review 471"), due 10 Dec 2025.
- `coursework_name` with the local due day: rows with the same name and due day are one set, as in the export.
- `coursework_status.status`: `completed`, `partially_graded`, `graded`, `returned` or `feedback_seen` mean finished. Anything else, or no row, is unfinished. `ignore`: ignored statuses are left out.
- **Why**: a student who stops working usually leaves assigned work undone. It is the second signal (query 7).

## Tables and fields checked and not used

| Table or field | What it holds for section 218 | Why it is not used |
|---|---|---|
| Attendance | Not recorded anywhere in the database | Days with no activity stand in for it (signal 1). |
| `section.term_start`, `term_end` | Empty | No term dates, so breaks are read from the data: a block in which nobody worked. |
| `student_engagement_history`, `student_engagement_predictions` | 35,369 and 35,951 rows, 3 Sep to 18 Dec 2025 ([../on-pace/data-sources.md](../on-pace/data-sources.md)) | ALPS's engagement is a percentile of time and attempts: a rank against other students, which cannot say that a student fell below their own normal. And it stops on 18 Dec. |
| `student_item_activity_hour` | Opens, reading minutes and media per student, question and hour | An open is recorded for only about one in eight of the readings and videos students worked past (the README's Stall points note), so it is not a reliable measure of work. |
| `coursework.release_date` | Set on 20 lessons, 1 to 7 days before they fell due | Not needed: a set counts from its due date. |
| `interaction_summary.time_spent_ms` | Time on each try | See above: first tries need no assumption about time. |

## What to expect on the database

Run on section 218 (`-v utc_offset=-4`), the queries should give what the export gives:

| Query | Expect |
|---|---|
| 1 | 36 students |
| 2 | `quiet_start` 5, `utc_offset` −4 |
| 3 | 11,002 rows, the earliest `first_day` 3 Sep 2025 and the latest 5 Feb 2026 |
| 4, as of `'2025-11-15'` | 4 drifting since 2025-11-06, 5 working less, 27 normal; `class_judged` 36, `class_low_now` 9, `class_last_five_days` 540, `class_usual` 664 |
| 4, as of `'2025-10-15'` | 14 drifting (8 since 2025-10-01, 6 since 2025-10-06), 1 working less; `class_low_now` 15, `class_last_five_days` 355, `class_usual` 712 |
| 4, as of `'2025-11-25'` | everyone "not judged: the class as a whole slowed"; `class_low_now` 33 |
| 4, as of `'2026-10-13'` (the export) | everyone "not judged: nobody in the class worked in the last five days"; `class_last_work` 2026-02-05 |
| 6 and 7, as of `'2025-11-15'` | for the student the page calls Christian: 3 days without work of 5, 3 sets unfinished |

If the database has changed since the export (13 Oct 2026), counts may differ a little. Query 9 lists the columns and types of every table read, to check them first.

## How the data was checked

- **The rule against the page**: [backtest.js](backtest.js) computes the rule from first-try days alone (what query 3 returns) and compares it with the page's own code on every day from 5 Sep 2025 (the earliest day the page can be read as of) to 15 Feb 2026, then weekly, and on the export day: 200 days, **no differences** in who is drifting, since when, who is working less, or anyone's normal.
- **The SQL against the page**: `backtest.js --tables` rebuilds the export as the database tables these queries read, adding rows the queries must leave out (a teacher, a removed, an ignored and a test student, a student of another class, ignored answers and assignments, opens, readings, a hidden lesson, an ignored placement, empty activity hours, a split set, a draft set, an ignored set, ignored statuses). [check-sql.py](check-sql.py) runs queries.sql on them in DuckDB and compares every answer with the page's: queries 4, 6, 7 and 8 on 5,832 student-days (162 days), query 5 on 3 days, query 3 against the export's 11,002 first tries, and query 2 against the export's own rule on 24 made-up classes. **No differences.**
- **The SQL as Postgres**: every query parses with Postgres's own parser (libpg_query). DuckDB and Postgres differ in places (DuckDB's `/` on integers is not integer division, and it subtracts only integers, not bigints, from dates), so the queries avoid those forms. Running them on the database remains the real check.
