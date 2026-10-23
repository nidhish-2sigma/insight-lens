# How the rule was tested, and the results

## The test

- **Class**: section 218 in `data/class.js` (36 students, exported 13 Oct 2026). Its work ran from 3 Sep 2025 to 5 Feb 2026.
- **Days**: every day from the first answer to the last, 156 days. The page was read as of each one (`?today=`), so it saw only answers given by then.
- **The rule, rebuilt**: [backtest.js](backtest.js) computes the rule in [method.md](method.md) from nothing but the day each student first tried each question (what query 3 returns), and checks it against the page's own code on every day.
- **What happened next**: for every student and day, two outcomes known only afterwards, from the export's later answers (below). Nobody saw these flags at the time, so the outcomes show what happens without a teacher's check-in.
- **The rules compared**: the page's rule, and versions of it with one choice changed (the number of low blocks, the cut, the normal's window, the class guard), plus three ways to stop a class-wide slowdown from counting against students. Every version was scored on the same outcomes.

### The measures, in plain words

- **Named**: the student-days a rule names as drifting. A student named on three days counts three times.
- **Still low ten days on**: over the next ten days, the student's work as a share of their normal is under half the class's share of its usual. "Under half their normal" again, after allowing for how much the class itself worked. Measured when the class did at least a quarter of its usual work in those ten days.
- **Behind a month on**: of the skills the class met in the next 30 days (a quarter of the class answered a question on them), the student met under half. Measured when the class met three or more new skills.
- **Classmates on the same days**: the same outcome among the classmates with a normal whom the rule did not name, on the same days. **×** is how many times as likely the named students were.
- **Named again the next day**: of the students named on a day, the share named on the next.

## Results

### The rule reproduces the page, and so does the SQL

- The rule computed from first-try days alone, against the page: 200 days (5 Sep 2025 to 15 Feb 2026, then weekly, and the export day), 43 flags, **no differences** in who is drifting, since when, who is working less, or anyone's normal.
- [queries.sql](queries.sql) in DuckDB on the export rebuilt as database tables, against the page: 5,832 student-days, **no differences** (see [data-sources.md](data-sources.md)).

### When the page can judge

| The 156 days from the first answer to the last | Days |
|---|---|
| The page judges (23 Sep to 19 Nov 2025) | 46 |
| Too early: nobody has a normal yet | 20 |
| The class slowed: half or more under half their normal | 45 |
| Nobody in the class worked in the last five days | 45 |

The class's own work decides most of this. After 19 Nov it never came back to its usual. From 20 Nov to 22 Dec it tried between 10 and 330 questions in any five days, against a usual five days of 684 as of 19 Nov. Then nobody worked from 23 Dec, apart from a single first try on 5 Feb. Through all of that the page names nobody and says why.

### What it names

- **43 student-days on 17 of the 46 days, 22 students in all.** About one a day when it judges. On 29 of the 46 days it names nobody; the most on one day is 14 (15 Oct 2025).
- **Most flags are short.** The day after a student was named:

| The next day | Times |
|---|---|
| They worked again: back over half their normal | 21 |
| Still named | 13 |
| The class slowed, so nobody was judged | 7 |
| The block before was no longer low (the blocks moved a day) | 2 |

Blocks count back from today, so they move a day at a time. That made a flag disappear only twice. Most flags ended because the student came back.

### What happened next

| | Named | Classmates, same days | × |
|---|---|---|---|
| Still low ten days on | 9 of 34 (26%) | 11% | 2.5 |
| Behind a month on | 9 of 43 (21%) | 23% | 0.9 |

- **A named student was 2.5 times as likely as a classmate to still be working under half their normal ten days later.** So a flag is worth a look. Three in four, though, were back within ten days.
- **Named students were no more likely to fall behind** on the skills the class met over the next month. On this class, Drifting finds a dip in work, not a fall in learning. Read it as "check in", not "falling behind".

### 15 Oct 2025: the one clear fault

As of 15 Oct the page named 14 students at once, a third of the term's flags:

| Block | Days | Class first tries | Share of the class's usual (712) | Under half their normal |
|---|---|---|---|---|
| 0, the last five days | 11 to 15 Oct | 355 | 50% | 15 of 36 |
| 1, the block before | 6 to 10 Oct | 28 | 4% | 35 of 36 |
| 2 | 1 to 5 Oct | 331 | 46% | 17 of 36 |
| 3 | 26 to 30 Sep | 684 | 96% | 4 of 36 |

- The class slowed for a fortnight and all but stopped in the middle of it. In 6 to 10 Oct it tried 28 questions, 4% of its usual, but that is not zero, so the block is not a break. 35 of 36 students were low in it.
- On 11 to 15 Oct the class came back at half its usual. Eleven of the 14 named students had tried 9 or 10 questions, and three none. Fifteen of 36 were under half their normal: under half the class, so the guard let the page judge.
- So 14 of those 15 were "drifting": 8 since 1 Oct, 6 since 6 Oct. (The 15th had worked in 6 to 10 Oct, so was only working less.) **None of the 14 was still low ten days later, and none fell behind.** They were coming back with the class.
- **The cause**: the guard looks only at the last five days. The block before counted against everyone, though the whole class had stopped in it.

How the fixes tested handle it:
- **Pass over class-slow blocks looking back** (a block in which the class did under half its usual is passed over, as a break is): 6 to 10 Oct and 1 to 5 Oct are passed over, so 11 to 15 Oct is compared with 26 to 30 Sep. It names 2: Dylan and John, low since 26 Sep.
- **Judge only when the class did three-quarters of its usual**: 15 Oct, at 50%, is not judged.
- **Pass over blocks half the class was low in** (the guard's own test, applied to every block): passes over 6 to 10 Oct but not 1 to 5 Oct, where 17 of 36 were low, just under half. It still names 9.

`node approach/drifting/backtest.js --example 2025-10-15` prints every student's blocks for the day.

### Which part does what

Each row changes one choice, or adds one fix, and reruns the whole test. The outcomes are the same for every row.

| Rule | Days judged | Named | Students | Still low 10 days on (classmates, ×) | Behind a month on (classmates, ×) | Named again next day |
|---|---|---|---|---|---|---|
| **The page today** | **46** | **43** | **22** | **9 of 34, 26% (11%, ×2.5)** | **9 of 43, 21% (23%, ×0.9)** | **30%** |
| One low block (today's "working less") | 46 | 220 | 35 | 26 of 156, 17% (13%, ×1.3) | 63 of 220, 29% (25%, ×1.1) | 46% |
| Three low blocks | 46 | 12 | 10 | 0 of 9, 0% (0%, ×0.0) | 1 of 12, 8% (19%, ×0.4) | 17% |
| Low = under a third of normal | 51 | 44 | 22 | 5 of 30, 17% (8%, ×2.1) | 8 of 44, 18% (25%, ×0.7) | 39% |
| Low = under two-thirds of normal | 40 | 50 | 19 | 12 of 47, 26% (11%, ×2.2) | 8 of 50, 16% (21%, ×0.7) | 38% |
| Normal from every earlier block | 56 | 40 | 22 | 9 of 33, 27% (8%, ×3.3) | 5 of 40, 13% (21%, ×0.6) | 33% |
| No class guard | 91 | 1,040 | 36 | 227 of 451, 50% (34%, ×1.5) | 322 of 585, 55% (49%, ×1.1) | 86% |
| **Pass over class-slow blocks looking back (proposed)** | **46** | **28** | **13** | **6 of 19, 32% (17%, ×1.9)** | **9 of 28, 32% (32%, ×1.0)** | **32%** |
| Pass over blocks half the class was low in | 46 | 35 | 18 | 6 of 26, 23% (13%, ×1.8) | 9 of 35, 26% (26%, ×1.0) | 29% |
| Judge only when the class did 3/4 of its usual | 38 | 15 | 10 | 7 of 15, 47% (15%, ×3.1) | 5 of 15, 33% (18%, ×1.8) | 27% |
| Both of the two above that pass over or wait | 38 | 12 | 10 | 4 of 12, 33% (16%, ×2.1) | 5 of 12, 42% (17%, ×2.4) | 8% |
| Judged against the class | 57 | 152 | 34 | 6 of 26, 23% (12%, ×1.9) | 22 of 49, 45% (41%, ×1.1) | 63% |

**Reading the table**: the numbers are small. One student moves a percentage by 3 to 10 points, so values of × within about half of each other are not different on this test. What the table can show:

- **Two blocks is right.** One block names 220 student-days, 35 of the 36 students, with little more than classmates still low ten days on (17% against 13%). Three blocks names 12 in the whole term, and none of the 9 that could be followed was still low.
- **Half is about right.** A third names as many (44) with less to show for it (17% still low); two-thirds names a few more (50) with the same 26%.
- **Leaving the latest two blocks out of the normal** judges ten fewer days: seven in the first weeks, when the normal is known later, and three in the slow fortnight of October, which a normal that took in the slow blocks would have judged. Otherwise it changes little, and it keeps a recent fall out of the normal it is measured against.
- **The class guard is essential.** Without it the rule names 1,040 student-days on 91 days, every student at some point. Half are still low ten days on, but so is a third of their classmates: the class itself was slow.
- **Passing over class-slow blocks** removes 12 of the 14 flags of 15 Oct and both of 16 Oct, on the same 46 days. Elsewhere it names Darren and Mariah from 16 Nov rather than 13 and 14 Nov (the class slowed on 8 and 9 Nov), and adds Mariah on 19 Oct and Dylan on 14 Nov. Of the flags it raises, 6 of 19 were still low ten days on. It is today's rule without its one clear fault: the proposal.
- **Passing over blocks half the class was low in** is the same idea with the guard's own test, but it misses 15 Oct (above).
- **Judging only when the class did three-quarters of its usual** gives the cleanest flags (7 of 15 still low, 5 of 15 behind), but on 38 days and 10 students. With the pass-over it names 12, and a flag shows again the next day only 8% of the time: the class's level crosses three-quarters from one day to the next, so the page would switch between naming students and saying the class is working less.
- **Judging against the class** (expecting less of everyone in a block in which the class did less) judges the slow weeks after 19 Nov too, but names 152 student-days and 34 of 36 students, with no more to show for it.

### The signals beside a row

On the 46 days the page judges, for the 43 named student-days and for their classmates with a normal:

| Signal | Named | Classmates |
|---|---|---|
| No work on 2 or more of the last 5 days (shown today) | 95% (41 of 43) | 75% |
| … on 4 or more of the 5 (tested) | 44% (19 of 43) | 16% |
| … on 2 or more of the days a quarter of the class worked, in the last 5 (tested) | 30% (13 of 43) | 18% |
| 2 or more assigned sets unfinished | 23% (10 of 43) | 16% |
| Accuracy down 10 points or more | 2% (1 of 43) | 8% |

- **"No work on 2 or more of the last 5 days" says little here.** It is true of three classmates in four. The class works on the platform on about three weekdays in five: of 36 students, 13.5 do something on an average Monday, 14.3 on a Tuesday, 12.6 on a Wednesday, 11.7 on a Thursday, 9.3 on a Friday, 1.6 on a Saturday and 2.8 on a Sunday. Shown at 4 or more days of 5, it marks 44% of named students and 16% of the others.
- **Sets unfinished** helps a little. Only 21 sets had a due date, the last on 10 Dec.
- **Accuracy** is rarely down for a named student. On this class a student who drifts does fewer questions, not worse ones.

## Where the method misses

- **A near-break counts as a week.** 15 Oct, above. The proposal fixes it.
- **The class's slow weeks are silent.** From 20 Nov to 5 Feb the page names nobody, because the class slowed or stopped. That is right for a class-wide slowdown, but a student who stopped altogether in those weeks is not singled out. Judging against the class is not the fix (above). A narrower check, for example no first tries at all in ten days while the class kept a quarter of its usual, was not tested.
- **Short dips.** In 21 of the 43 times a student was named, they were back over half their normal the next day. A flag is a prompt to look at the line, which shows the dip.
- **The first weeks.** For the first 20 days nobody has a normal, and the page says "Nobody is drifting below their own normal". It should say it is too early to judge.
- **Learning.** Named students did not fall behind on new skills more than their classmates. Drifting is about work. Falling behind is On pace's question.

## Limits of this test

- **One class and one term, and few flags.** 43 named student-days, 22 students. The rule has no rates to learn, so it carries over to other classes as it is, but how often it is right should be checked on more of them.
- **The outcomes are this test's own.** "Still low" allows for the class's own level over the next ten days. "Behind" counts the skills the class met. The database holds no marks or attendance to check against.
- **The SQL was checked on the export, not on the database.** It returns the page's answers on tables rebuilt from `data/class.js`, which `tools/export-atlas.py` read from the database on 13 Oct 2026. [data-sources.md](data-sources.md) says what it should return on the database.
- **Accuracy as of a past day.** The page reads the export's summary of each question, so as of a past day its accuracy signal counts retries made later. Query 8 counts only tries made by then. The two agree as of the export date.

## How to rerun

From the repository root (Node 18 or later; under a minute):

```
node approach/drifting/backtest.js                               the tables above
node approach/drifting/backtest.js --example 2025-11-15          one day, student by student (the day of the fault: 2025-10-15)
node approach/drifting/backtest.js --json rows.json              every student-day: who is named, and the outcomes
node approach/drifting/backtest.js --tables t.json               the export as database tables, and the page's answers, for check-sql.py
python3 approach/drifting/check-sql.py t.json                    queries.sql in DuckDB against the page (pip install duckdb)
```

The scripts read `js/atlas.js`, `data/class.js` and `data/sample.js`, and change nothing.
