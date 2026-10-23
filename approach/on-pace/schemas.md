# Schemas

Three layers:
1. The **database tables** the method reads, and how they join.
2. The **input** the calculation reads (`data/class.js`, which `tools/export-atlas.py` writes from those tables).
3. The **output** the On pace page would draw.

Why each field is used is in [data-sources.md](data-sources.md). The SQL is in [queries.sql](queries.sql).

## 1. Database tables

Types are as the database reports them. **NN** means not null. Only the columns the method reads are listed.

### How they join

```
section ──< section_user >── app_user
   │            │
   │            └──< assignment >── coursework_item >── coursework (teacher's practice sets, query 7)
   │                    │
   │                    └──< interaction_summary >── item ──< item_skill >── skill
   │                                                  │
section_curriculum ── curriculum ──< curriculum_unit_order >── unit ──< curriculum_unit_item >──┘
                                                                  │
                                                                  └──< unit_skill_coverage >── skill
```

`A ──< B` means one A has many B. The joins:

- `section.section_id` = `section_user.section_id` = `section_curriculum.section_id`; `section_user.app_user_id` = `app_user.app_user_id`
- `section_user.section_user_id` = `assignment.section_user_id`; `assignment.assignment_id` = `interaction_summary.assignment_id`
- `interaction_summary.item_id` = `item.item_id` = `item_skill.item_id`; `item_skill.skill_id` = `skill.skill_id`
- `curriculum_unit_order (unit_id, curriculum_id)` places a `unit` in a book; `unit.parent_id` ties a lesson to its unit
- `curriculum_unit_item (unit_id, curriculum_id, item_id)` places a question in a lesson
- `unit_skill_coverage (unit_id, skill_id)` gives a lesson's weights for a skill

### `section`
| Column | Type | Used for |
|---|---|---|
| `section_id` | integer NN | the class |
| `curriculum_id` | varchar | the main textbook |
| `term_start`, `term_end` | date | checked: empty for section 218 |

### `section_curriculum`
| Column | Type | Used for |
|---|---|---|
| `section_id` | integer NN | the class |
| `curriculum_id` | varchar NN | a book the class lists |
| `role` | varchar NN | `primary` or `supplemental` |
| `ordering` | real NN | the order of the books |
| `ignore` | boolean NN | left out when true |

### `section_user`, `app_user`
| Column | Type | Used for |
|---|---|---|
| `section_user.section_user_id` | integer NN | one student in this class (joins to `assignment`) |
| `section_user.app_user_id` | integer | the person (joins to the learner model's tables) |
| `section_user.section_id` | integer | the class |
| `section_user.role` | enum `app_user_role` | only `student` |
| `section_user.ignore`, `deleted_at` | boolean, timestamp | removed students left out |
| `app_user.is_virtual` | boolean | test users left out |

### `unit`, `curriculum_unit_order`
| Column | Type | Used for |
|---|---|---|
| `unit.unit_id` | integer NN | a unit or a lesson |
| `unit.parent_id` | integer | a lesson's unit |
| `unit.level` | integer | 1 = unit, 2 = lesson |
| `unit.source_curriculum_id` | varchar | the book it belongs to |
| `unit.ignore` | boolean | left out when true |
| `curriculum_unit_order.curriculum_id`, `unit_id` | varchar, integer | the book's own placement of the unit |
| `curriculum_unit_order.ordering` | real NN | book order |
| `curriculum_unit_order.display_id`, `display_name` | varchar NN, text | "2.3", and its name |
| `curriculum_unit_order.hidden`, `ignore` | boolean | left out of the book when true |

### `curriculum_unit_item`, `item`
| Column | Type | Used for |
|---|---|---|
| `curriculum_unit_item.unit_id` | integer NN | the lesson the question is in |
| `curriculum_unit_item.item_id` | integer NN | the question |
| `curriculum_unit_item.ordering` | real NN | its place in the lesson |
| `curriculum_unit_item.ignore` | boolean | left out when true |
| `item.item_type` | enum `item_type` NN | graded types only |
| `item.ignore` | boolean | left out when true |

### `item_skill`, `skill`
| Column | Type | Used for |
|---|---|---|
| `item_skill.item_id`, `skill_id` | integer NN, uuid NN | the question checks this skill |
| `item_skill.relevance_score` | real NN | only above 0.5 |
| `item_skill.dok` | integer NN | read, not used |
| `item_skill.ignore` | boolean | left out when true |
| `skill.title`, `description` | varchar, text NN | the skill's name |
| `skill.skill_set_id` | integer NN | the book's skill set (19) |

### `unit_skill_coverage`
| Column | Type | Used for |
|---|---|---|
| `unit_id` | integer NN | the lesson |
| `skill_id` | uuid NN | the skill |
| `teach_weight` | numeric NN | above 0: the lesson teaches it (the goal's earlier skills, and lessons' lists) |
| `assess_weight` | numeric NN | above 0: the lesson assesses it (a unit's key skills) |

### `interaction_summary`, `assignment`
| Column | Type | Used for |
|---|---|---|
| `assignment.assignment_id` | integer NN | joins an answer to a student |
| `assignment.section_user_id` | integer NN | the student |
| `assignment.ignore` | boolean | left out when true |
| `interaction_summary.interaction_summary_id` | integer NN | breaks ties in the order of tries |
| `interaction_summary.item_id` | integer NN | the question |
| `interaction_summary.item_type` | enum `item_type` NN | graded types only |
| `interaction_summary.action` | enum `action_type` NN | `check` and `code_run` only |
| `interaction_summary.correct` | boolean | right or not, try by try |
| `interaction_summary.timestamp` | timestamp NN | when (UTC); the first one per student and question is the day they met it |
| `interaction_summary.ignore` | boolean | left out when true |

### `coursework`, `coursework_item` (practice sets the teacher targeted)
| Column | Type | Used for |
|---|---|---|
| `coursework.coursework_id` | integer NN | a set |
| `coursework.section_id` | integer NN | the class |
| `coursework.coursework_type` | enum `coursework_type` | anything but `self_guided_practice` (the book's own lessons) |
| `coursework.ignore` | boolean | left out when true |
| `coursework_item.coursework_id`, `item_id`, `coursework_item_id` | integer NN | the set's questions; joins to `assignment` |

### Optional and reference tables
| Table, columns | Types | Why |
|---|---|---|
| `item_metrics.item_id`, `p_first`, `n_assignments` | integer NN, double, integer NN | a cross-class difficulty prior (optional, not in the proposal) |
| `learner_model_config.key`, `value`, `version` | text NN, jsonb, integer NN | the learner model's level cut-offs (`levels.perf.19`) |
| `curriculum_skill_set.curriculum_id`, `skill_set_id` | varchar NN, integer NN | the book's skill set, to find those cut-offs |
| `student_performance_predictions.app_user_id`, `skill_id`, `performance_score`, `data_cutoff` | integer NN, uuid NN, real, timestamp NN | the learner model's latest scores: checked, not used |

## 2. The input the calculation reads

`data/class.js` sets `window.ATLAS_DATA`. The page already loads it. The projection reads these fields:

| Field | Shape | What it is | Used for |
|---|---|---|---|
| `meta.day0` | `"2025-09-01"` | the first day of work. Every day below is a number of days from it | dates |
| `meta.exported` | `"2026-10-13"` | the export date, "today" unless `?today=` | the as-of day |
| `students` | `["Aimee", …]` | names; a student is their index | one projection each |
| `units[]` | `{id, num, name, subs: [lesson index], pre: [[skill, lesson]]}` | the book's units, in order | the goal |
| `subs[]` | `{id, u, code, name, items: [item index], skills: [[skill, taught 0/1, checked 0/1]]}` | lessons; a lesson lists up to three skills its questions check (its heaviest teaching weights first), and at most one more it teaches that no question checks | key skills and earlier skills |
| `items[]` | `{id, name, type, sub, est, skills: [skill index]}` | questions and their tags (relevance above 0.5, at most three) | evidence |
| `skills` | `["Class Instantiation in Java", …]` | skill names; a skill is its index | names |
| `att[]` | `[student, item, right first try, right within 3, ever right, tries, first day, seconds, last day, first right try, seconds on first try]` | one row per student and question | the evidence: the credit (from `first right try` and the type) and the day (`first day`) |
| `sets[]` | `{name, type, day, due, rows: [[student, item, right first, ever right, day]]}` | practice sets the teacher targeted | later checks |

From these the page already derives, per student and skill:
- `EVD[i][k]`: the dated checks `[{d, c}]`, in date order. The first `d` is the day they met the skill.
- `estOf(i, k, day)`: `{ev, c}` on any day: the number of checks and the score. Mastered is `ev ≥ 2` and `c ≥ 0.8`.
- `paceScope(u)`: the goal's skills, `{target, previous, ks}`.

The projection needs nothing new from the database: every quantity in [method.md](method.md) comes from `EVD`, `estOf` and `paceScope`.

## 3. The output

One object for the page: one goal, one as-of day, one goal date. Example values are Unit 4 as of 15 Nov 2025, goal date 15 Dec 2025, with one student shown (Karen).

```json
{
  "goal": { "unit": "Unit 4 · Data Collections", "skills": 42, "keySkills": 32, "earlierSkills": 10, "goalDate": "2025-12-15" },
  "asOf": "2025-11-15",
  "schedule": {
    "assumption": "pace",
    "paceDays": 30,
    "classMetNow": 28,
    "classMetBefore": 16,
    "pacePerDay": 0.4,
    "left": 14,
    "reach": 12,
    "allReachedBy": "2025-12-20",
    "lastClassWork": "2025-11-15"
  },
  "classFirstWeekRate": 0.344,
  "students": [
    {
      "student": "Karen",
      "now": 18,
      "metOfGoal": 29,
      "ahead": 13,
      "participation": 0.98,
      "skillsMetForRate": 55,
      "masteredWithinWeek": 26,
      "firstWeekRate": 0.453,
      "newSkillsMet": 11.8,
      "projected": 23.3,
      "low": 20.4,
      "high": 26.3,
      "status": "short",
      "shortBy": 19
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `goal.skills`, `keySkills`, `earlierSkills` | the goal's size: key skills of the unit + earlier skills used |
| `goal.goalDate`, `asOf` | the teacher's date, and "today" |
| `schedule.assumption` | `"pace"` (the class's pace, the default) or `"plan"` (every remaining goal skill reached by the date) |
| `schedule.classMetNow`, `classMetBefore` | goal skills the class had met by the as-of day, and `paceDays` before it |
| `schedule.pacePerDay` | (classMetNow − classMetBefore) ÷ paceDays |
| `schedule.left`, `reach` | goal skills the class has not met, and how many it reaches by the goal date under the assumption |
| `schedule.allReachedBy` | the day the class would meet all of them at its pace (`null` when the pace is 0) |
| `schedule.lastClassWork` | the latest day anyone in the class answered a question. When it is 30 or more days before `asOf`, the page says the class has not worked since then |
| `classFirstWeekRate` | the share of newly met skills mastered within a week, over the whole class |
| `students[].now` | goal skills mastered on the as-of day |
| `students[].metOfGoal`, `ahead` | goal skills the student has met, and goal skills neither they nor the class has met |
| `students[].participation` | of the skills the class has met, the share this student has met |
| `students[].skillsMetForRate`, `masteredWithinWeek` | the evidence behind the first-week rate (shown on hover) |
| `students[].firstWeekRate` | (masteredWithinWeek + 10 × classFirstWeekRate) ÷ (skillsMetForRate + 10) |
| `students[].newSkillsMet` | min(ahead, reach) × participation |
| `students[].projected`, `low`, `high` | the projection and its 80% range |
| `students[].status`, `shortBy` | `reaches` (low ≥ goal), `may reach` (goal inside the range) or `short` (high < goal), and by how much (goal − projected, rounded) |
