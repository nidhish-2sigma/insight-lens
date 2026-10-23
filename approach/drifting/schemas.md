# Schemas

Three layers:
1. The **database tables** Drifting reads, and how they join.
2. The **input** the page reads (`data/class.js`, which `tools/export-atlas.py` writes from those tables).
3. The **output** the Drifting page draws, for one day.

Why each field is used is in [data-sources.md](data-sources.md). The SQL is in [queries.sql](queries.sql).

## 1. Database tables

Only the columns Drifting reads are listed. **NN** means not null. Types without a mark are as the database reported them for On pace ([../on-pace/schemas.md](../on-pace/schemas.md)). Types marked † are as `tools/export-atlas.py` uses them and have not been read from the database: query 9 lists the real ones.

### How they join

```
section_user >── app_user
     │
     ├──< assignment ──< interaction_summary ──(item_id)── curriculum_unit_item >── unit (a lesson) >── unit (its unit)
     │                                                              │                    │
     │                                                              └── curriculum_unit_order: the book's placement, hidden and ignore
     │
     ├──< student_activity_hour            (one row per student and hour)
     │
     └──< coursework_status >── coursework (the class's assigned sets)
```

`A ──< B` means one A has many B. The joins:

- `section_user.section_user_id` = `assignment.section_user_id` = `student_activity_hour.section_user_id` = `coursework_status.section_user_id`; `section_user.app_user_id` = `app_user.app_user_id`
- `assignment.assignment_id` = `interaction_summary.assignment_id`
- `interaction_summary.item_id` = `curriculum_unit_item.item_id`; `curriculum_unit_item.unit_id` = `unit.unit_id` (a lesson); `unit.parent_id` = its unit; `curriculum_unit_order (unit_id, curriculum_id)` places both in the book
- `coursework.coursework_id` = `coursework_status.coursework_id`
- `section_user.section_id` = `student_activity_hour.section_id` = `coursework.section_id`: the class

### `section_user`, `app_user`
| Column | Type | Used for |
|---|---|---|
| `section_user.section_user_id` | integer NN | one student (joins to the answers, the activity and the sets) |
| `section_user.app_user_id` | integer | joins to `app_user` |
| `section_user.section_id` | integer | the class |
| `section_user.role` | enum `app_user_role` | only `student` |
| `section_user.ignore`, `deleted_at` | boolean, timestamp | removed students left out |
| `app_user.is_virtual` | boolean | test users left out |

### `assignment`, `interaction_summary`
| Column | Type | Used for |
|---|---|---|
| `assignment.assignment_id` | integer NN | joins an answer to a student |
| `assignment.section_user_id` | integer NN | the student |
| `assignment.ignore` | boolean | left out when true |
| `interaction_summary.interaction_summary_id` | integer NN | numbers the tries in order (accuracy signal) |
| `interaction_summary.item_id` | integer NN | the question |
| `interaction_summary.item_type` | enum `item_type` NN | graded types only; quick question or task (accuracy signal) |
| `interaction_summary.action` | enum `action_type` NN | `check` and `code_run` only |
| `interaction_summary.correct` | boolean | the try that was first right (accuracy signal) |
| `interaction_summary.timestamp` | timestamp NN | when, in UTC: the earliest per student and question is the first try |
| `interaction_summary.ignore` | boolean | left out when true |

### `curriculum_unit_item`, `curriculum_unit_order`, `unit`: the book's lessons
| Column | Type | Used for |
|---|---|---|
| `curriculum_unit_item.curriculum_id`, `unit_id`, `item_id` | varchar, integer NN, integer NN | a question placed in a lesson of the book |
| `curriculum_unit_item.ignore` | boolean | left out when true |
| `unit.unit_id`, `parent_id`, `level` | integer NN, integer, integer | a lesson (`level` 2) under its unit (`level` 1) |
| `unit.ignore` | boolean | left out when true |
| `curriculum_unit_order.curriculum_id`, `unit_id` | varchar, integer | the book's own placement of a lesson or unit |
| `curriculum_unit_order.hidden`, `ignore` | boolean | left out of the book when true |

### `student_activity_hour`
| Column | Type | Used for |
|---|---|---|
| `section_id` | integer † | the class |
| `section_user_id` | integer † | the student |
| `hour_start` | timestamp † | the hour, in UTC: the class's quiet hours (the offset), and the local day |
| `items` | integer † | questions and pages touched in the hour: the quiet hours, and whether a day had any work |
| `graded_attempts` | integer † | graded answers in the hour: whether a day had any work |

### `coursework`, `coursework_status`
| Column | Type | Used for |
|---|---|---|
| `coursework.coursework_id` | integer NN | a set |
| `coursework.section_id` | integer NN | the class |
| `coursework.coursework_name` | text † | with the due day, which rows are one set |
| `coursework.due_date` | timestamp † | when it is due, in UTC |
| `coursework.visibility` | enum † | `published` or `released` only |
| `coursework.ignore` | boolean | left out when true |
| `coursework_status.coursework_id`, `section_user_id` | integer † | a student's status on a set |
| `coursework_status.status` | enum † | `completed`, `partially_graded`, `graded`, `returned` or `feedback_seen` is finished |
| `coursework_status.ignore` | boolean † | left out when true |

## 2. The input the page reads

`data/class.js` sets `window.ATLAS_DATA`. Drifting reads these fields:

| Field | Shape | What it is | Used for |
|---|---|---|---|
| `meta.day0` | `"2025-09-01"` | the Monday of the first week of work. Every day below is a number of days from it, in local time | dates |
| `meta.utcOffset` | `-4` | the offset the export applied (query 2) | local days |
| `meta.exported` | `"2026-10-13"` | the export date, "today" unless `?today=` | the as-of day |
| `students` | `["Aimee", …]` | names; a student is their index | one row each |
| `items[]` | `{id, type, sub, …}` | questions, with their type | graded or not; quick or task (credit) |
| `att[]` | `[student, item, right first try, right within 3, ever right, tries, first day, seconds, last day, first right try, seconds on first try]` | one row per student and question | the work (`first day`); the credit (`first right try` and the type) |
| `daily[]` | `[student, day, items, graded attempts, correct attempts]` | one row per student and local day, from `student_activity_hour` | days with no work |
| `coursework[]` | `{name, type, due, sub, done: [student]}` | assigned sets with a due date, and who finished each | sets unfinished |

From these the page derives, as of today:
- `WB[i][j]`: student `i`'s first tries in block `j` (oldest first; the last is the last five days). `CTOT[j]`: the class's. `ONB[j]`: the block had class work.
- `NORM[i]`: the normal, or `null`. `LOWB(i, j)`: low in block `j`.
- `CLASSIDLE`, `CLASSLOW`: the class guard. `DR[i]`: the day the drift began, or −1. `WATCH[i]`: working less.
- `SIG[name]`: `{miss, of, work, acc}`, the three signals.

Query 4 returns the same, one row per student; query 5 returns `WB` and `CTOT`; queries 6 to 8 return `SIG`.

## 3. The output

One object for the page, for one day. Example values are as of 15 Nov 2025, with one drifting student shown in full (Christian).

```json
{
  "asOf": "2025-11-15",
  "class": {
    "state": "judged",
    "lastFiveDays": { "from": "2025-11-11", "to": "2025-11-15", "firstTries": 540 },
    "usual": 664,
    "judged": 36,
    "lowNow": 9,
    "lastWork": "2025-11-15",
    "breaks": [{ "from": "2025-09-01", "to": "2025-09-01" }]
  },
  "answer": "4 students are drifting below their own normal.",
  "drifting": [
    {
      "student": "Christian",
      "since": "2025-11-06",
      "normal": 19,
      "band": [9.5, 28.5],
      "lastFiveDays": 5,
      "blockBefore": 8,
      "line": [["2025-09-02", 0], ["2025-09-07", 24], ["2025-09-12", 24], ["2025-09-17", 65], ["2025-09-22", 31], ["2025-09-27", 16],
               ["2025-10-02", 12], ["2025-10-07", 2], ["2025-10-12", 19], ["2025-10-17", 10], ["2025-10-22", 12], ["2025-10-27", 22],
               ["2025-11-01", 20], ["2025-11-06", 8], ["2025-11-11", 5]],
      "signals": { "daysWithoutWork": 3, "ofDays": 5, "setsUnfinished": 3, "accuracyChange": -5 },
      "shown": ["No work on 3 of the last 5 days", "3 sets unfinished"]
    }
  ],
  "workingLess": [
    { "student": "Antonio", "lastFiveDays": 1, "normal": 15 },
    { "student": "Dylan", "lastFiveDays": 2, "normal": 19 },
    { "student": "Travis", "lastFiveDays": 1, "normal": 6 },
    { "student": "Yolanda", "lastFiveDays": 1, "normal": 16 },
    { "student": "Yvette", "lastFiveDays": 1, "normal": 19 }
  ]
}
```

| Field | Meaning |
|---|---|
| `asOf` | today |
| `class.state` | `judged`, `slowed` (half or more of the students with a normal are low: nobody is named) or `not working` (nobody worked in the last five days: nobody is named) |
| `class.lastFiveDays` | block 0 and the class's first tries in it |
| `class.usual` | the lower median of the class's first tries in its earlier live blocks (block 2 and older). Used in the page's message when the class slowed |
| `class.judged`, `lowNow` | students with a normal, and how many of them are low in the last five days |
| `class.lastWork` | the latest day anyone in the class first tried a question. The page gives it when the class is not working |
| `class.breaks` | blocks in which nobody worked, hatched on every line |
| `answer` | the page's answer line |
| `drifting[].since` | the first day of the run of low blocks that reaches today |
| `drifting[].normal`, `band` | the normal, and the band drawn around it (half to one and a half times) |
| `drifting[].lastFiveDays`, `blockBefore` | first tries in block 0, and in the live block before it |
| `drifting[].line` | the first day of each live block and the student's first tries in it, oldest first |
| `drifting[].signals` | queries 6 to 8: days with no work of the last five, sets due in the last 35 days and unfinished, accuracy change in points |
| `drifting[].shown` | the signals past their thresholds (2 or more days, 2 or more sets, down 10 points or more), as the row shows them |
| `workingLess[]` | low in the last five days only: one line of names, with "1 of 15" |
