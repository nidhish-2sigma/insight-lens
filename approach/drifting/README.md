# Drifting: finding students whose work has fallen below their own normal

Drifting asks: **"Who is drifting, and since when?"** Each row names a student whose work has been under half their own normal for two five-day blocks, the day it began, a line of their work, and three signals beside it. This folder says how to work all of that out from the database, which fields it needs and why, and how the rule behaved on the real class the mock uses (section 218: 36 students, CS Awesome 2.0, work from 3 Sep 2025 to 5 Feb 2026).

## The short answer

- **Count the questions each student first tried in each five-day block, and compare the last two blocks with the student's own normal.** Under half of it in both is drifting. The rule needs one thing from the database: the day each student first tried each question.
- When nobody in the class worked in the last five days, or half the class is low too, the page names nobody and says why.
- [queries.sql](queries.sql) does the whole calculation in SQL. In DuckDB, on the export rebuilt as database tables, it gives the page's answer on every day of the term. It has not been run on the database itself yet: [data-sources.md](data-sources.md) says what it should return there.

```
work      =  questions first tried in a five-day block, on any unit        blocks count back from today: block 0 is the last five days
normal    =  the middle of the student's earlier blocks with class work,   a block in which nobody in the class worked is a break,
             the latest two left out (three or more needed)                and is left out
drifting  =  under half of normal in the last five days
             and under half of normal in the block with class work before them
             └ only while the class works: nobody is named when nobody worked in the last five days,
               or when half or more of the class is under half their normal too
since     =  the first day of the run of low blocks that reaches today
```

## The method in six steps

1. **The work**: the local day of each student's first try on each graded question in the book's lessons (`interaction_summary`, `assignment`). The offset from UTC is read off the class's quiet hours (`student_activity_hour`).
2. **Five-day blocks, counted back from today**: block 0 is the last five days. A block in which nobody in the class worked is a break, and is left out.
3. **The normal**: the middle (lower median) of the student's blocks before the last two. Three or more are needed.
4. **Low**: under half the normal.
5. **The class guard**: nobody is judged when nobody worked in the last five days, or when half or more of the students with a normal are low.
6. **Drifting, and since when**: low in the last five days and in the block before them. "Since" is the first day of the run of low blocks. Low in the last five days only is "working less", one line of names.

Beside each row: days with no activity in the last five (`student_activity_hour`), assigned sets due in the last 35 days and not finished (`coursework`, `coursework_status`), and the change in accuracy over the last 30 days.

Full detail, with edge cases and a worked example: [method.md](method.md).

## Why this approach

- **Each student against their own normal.** On 15 Nov 2025 the normals run from 6 to 38 questions per five days. Against the class's middle, the same light workers would be named every week.
- **Questions first tried, on any unit.** A count of new questions taken on: retries do not inflate it, and catching up on an earlier unit or working ahead counts as work.
- **Breaks come from the data.** The database holds no term dates, no timetable and no attendance. A stretch in which nobody worked is the only break the data can show.
- **The class guard.** When the class slows, most students fall under half their normal at once, and naming them says nothing about any one of them. Without the guard the rule would have named 1,040 student-days on this class instead of 43.
- **It uses only data the database holds completely**: every answer and when it was given. ALPS's engagement scores rank students against each other, and for this class they stop on 18 Dec 2025 ([data-sources.md](data-sources.md)).

## How it behaved on the real class

Every day from 3 Sep 2025 to 5 Feb 2026 was read as of that day, then followed with the export's later answers:

- **The rule reproduces the page exactly**: from first-try days alone on 200 days, and as SQL on 5,832 student-days.
- **It judges on 46 of the 156 days** (23 Sep to 19 Nov). Before that nobody has a normal. After it the class itself slowed or stopped, and the page says so.
- **It names about one student a day when it judges**: 43 student-days on 17 days, 22 students in all.
- **A named student was 2.5 times as likely as a classmate to still be under half their normal ten days later** (9 of 34, against 11%). Three in four were back within ten days.
- **Named students were no more likely to fall behind** on the skills the class met over the next month (21%, against 23%). Drifting finds a dip in work, not a fall in learning.
- **One clear fault.** On 15 Oct the class came back from a fortnight in which it had all but stopped (28 first tries in the block before, 4% of its usual), and the page named 14 students at once, a third of the term's flags. None was still low ten days later, and none fell behind. The block before counted against them, though the whole class had stopped in it.

| Rule | Days judged | Named | Still low 10 days on (classmates) | Behind a month on (classmates) |
|---|---|---|---|---|
| The page today | 46 | 43 | 26% (11%) | 21% (23%) |
| **Proposed: pass over class-slow blocks looking back** | **46** | **28** | **32% (17%)** | **32% (32%)** |
| Judge only when the class did 3/4 of its usual | 38 | 15 | 47% (15%) | 33% (18%) |
| One low block (today's "working less") | 46 | 220 | 17% (13%) | 29% (25%) |
| No class guard | 91 | 1,040 | 50% (34%) | 55% (49%) |

The numbers are small: one student moves a percentage by 3 to 10 points. Full results: [evaluation.md](evaluation.md).

## What would change on the page

- **Pass over a class-slow block when looking back** (proposed). A block in which the class as a whole did under half its usual work is passed over, as a break is, when looking for the block before. It removes 12 of the 14 flags of 15 Oct, on the same 46 days. The line can mark those blocks the way it hatches breaks.
- **Say when it is too early.** For the first 20 days nobody has a normal, and the page says "Nobody is drifting below their own normal". It should say that a normal needs three five-day blocks of work before the last two.
- **The days-without-work signal.** "No work on 2 or more of the last 5 days" is true of three classmates in four, because the class works on the platform on about three weekdays in five. Shown at 4 or more days of 5, it marks 44% of named students and 16% of the others.

## Decisions that are yours

1. **The pass-over** (proposed): it fixes the one clear fault the test found, at no measurable cost.
2. **How strict the class guard is.** Today the page judges while fewer than half the students are under half their normal. Judging only when the class did three-quarters of its usual gave the cleanest flags (7 of 15 still low), but on 38 days, for 10 students, and the page would switch between naming students and saying the class is working less from one day to the next.
3. **The days-without-work threshold**: 2 days (today), 4 days, or 2 of the days on which a quarter of the class worked.
4. **The class's slow weeks.** From 20 Nov to 5 Feb nobody is named. That is right for a class-wide slowdown. A check for a student who stopped altogether while the class kept some of its work going was not tested.
5. **What a flag means.** On this class, a dip in work rather than a fall in learning. The page's words ("Since 6 Nov", "Work fell below their normal") say that. Falling behind is On pace's question.

## Files in this folder

| File | What it holds |
|---|---|
| [README.md](README.md) | This summary |
| [data-sources.md](data-sources.md) | Every table and field the rule uses and why; the tables checked and not used; what the queries should return on the database |
| [method.md](method.md) | The calculation step by step, edge cases, and a worked example on the real class |
| [schemas.md](schemas.md) | Database table schemas, the input the page reads, and the output it draws (with JSON) |
| [evaluation.md](evaluation.md) | How the rule was tested, all the results, and what each choice does |
| [queries.sql](queries.sql) | Read-only SQL for every input and the whole calculation |
| [backtest.js](backtest.js) | Reruns every number here: `node approach/drifting/backtest.js` |
| [check-sql.py](check-sql.py) | Runs queries.sql in DuckDB on the export rebuilt as database tables, and compares it with the page |
