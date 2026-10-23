# On pace: projecting how many skills each student will have mastered by a date

On pace asks: **"Will each student reach the target unit's key skills by the goal date?"** Each row shows a student's mastered skills now and a projected number by the teacher's date ("Now → est."). This folder says how to work out that projected number, which database fields it needs and why, and how well it predicts. The evidence is a test on the real class the mock uses (section 218: 36 students, CS Awesome 2.0, work from 3 Sep 2025 to 5 Feb 2026).

## The short answer

- **Count what is mastered now, then add only the new skills each student will meet before the date, at the rate that student masters new skills.**
- The class's pace says how many of the goal's skills the class will reach by the date. Each student's own history says how many of those they will master.
- Skills a student is weak in are not counted as recovering, and mastered skills are not counted as fading: both were tested, and both made the projection worse (see [evaluation.md](evaluation.md)).

```
projected  =  mastered now  +  new skills met by the date  ×  first-week mastery rate
                                 │                              │
                                 └ the class's pace on this     └ the share of skills this student mastered within a
                                   goal × this student's          week of first meeting them, pulled toward the class's
                                   participation                  rate when they have met few
```

## The method in five steps

1. **The goal** (unchanged): the target unit's key skills plus the earlier skills its lessons use, each counted once.
2. **Mastered now** (unchanged): a score of 80% or more on two or more checks, the page's own rule (ALPS's cut).
3. **The class's schedule**: how many of the goal's skills the class has *not* met yet, and how many it will meet by the date at its pace of the last 30 days. The class has met a skill once a quarter of the class has answered a question on it.
4. **Each student's share**:
   - *participation*: of the skills the class has met, the share this student has met too;
   - *first-week mastery rate*: of the skills this student met at least a week ago, the share they had mastered a week after first meeting them, pulled toward the class's rate with the weight of 10 skills.
5. **The projection and its range**: mastered now + (new skills they will meet) × (their first-week rate). The new skills are capped at the goal skills this student has not met yet. An 80% range comes with it.

Full detail with formulas and a worked example: [method.md](method.md).

## Why this approach

- **New mastery comes mostly from meeting new skills.** Over this term, 92% of mastered skills were still mastered 30 days later. Few weak skills became mastered within a month: proficient 12%, one check 16%, attempted 8%, familiar 3%, beginning under 1%. Those rates also swing with the term: learned from the busy early weeks they were about twice as high, and counting them made the projection worse.
- **Mastery comes fast or not much at all.** 33% of the skills students met were mastered within a week of meeting them, and only 39% within a month.
- **Students differ a lot, and consistently.** The first-week rate runs from 10% to 57% across the class (the middle half is 25% to 43%), over about 61 skills each, so each student's own rate is measurable.
- **The schedule is a class matter.** Whether a goal skill can be mastered by the date depends first on whether the class reaches it. The method keeps that part separate and says it out loud.
- **It uses only data the database holds completely**: every answer, its date and the skills its question checks. The learner model's stored scores could not be used: for this class they are one snapshot and do not tell mastered skills from weak ones (see [data-sources.md](data-sources.md)).

## How much better it is

Tested as of five past days (1 Oct to 1 Dec 2025), with goal dates 15, 30 and 45 days ahead, on the goal of every unit with five or more goal skills (10 units), for every student: 5,400 projections. Each method projected using only what was known on the as-of day, and its projection was compared with what the page itself counted on the goal date.

| Method | Average miss (skills) | Big-miss measure (RMSE) | Bias (+ = too high) | Picks out who gains (correlation) |
|---|---|---|---|---|
| The page today (each student's recent rate, extended) | 2.02 | 3.06 | +1.44 | 0.29 |
| No change (projected = now) | 0.96 | 1.91 | −0.71 | none |
| **Proposed, at the class's pace** | **0.90** | **1.47** | **+0.15** | **0.58** |
| Proposed, if the schedule were known (only afterwards) | 0.71 | 1.26 | −0.20 | 0.73 |

- The proposed method misses by about half as much as today's method, and today's habit of projecting too high is gone.
- Its 80% range holds the real count 79% of the time.
- **On the unit the class is in, every method finds it harder.** The proposed method misses by 2.09 skills, against 4.29 for today's. The cause is the schedule: classes speed up and slow down. In the worked example the class met 12 goal skills in the month before 15 Nov, then 1 in the month after. Its work fell from 1,500 first tries in early November to 244 in early December.

Full results: [evaluation.md](evaluation.md).

## What would change on the page

- The row keeps "Now → est." and adds the range ("12 → ~16, 13 to 19").
- The answer and the goal line name the schedule they assume, for example: "At the class's pace of the last 30 days it reaches 12 of the 14 skills left by 15 Dec."
- A what-if, "If you teach the rest of the unit by your date", shows the projection with every remaining skill reached by then. Tested as a forecast it runs high (+1.33): in none of the 15 tests on the unit the class was in did the class reach all of that unit's goal skills by the goal date. As a teacher's plan it is the right question to offer, not the default.
- When the class has done no work in the last 30 days (a break, or an old export such as today's default view), the page says so. It should not quietly extend an old pace.

## Decisions that are yours

1. **Default schedule**: the class's pace (proposed, the better forecast), or the teacher's plan (what-if).
2. **An old export or a break**: show no gains and say the class has not worked since a date (proposed), or use the class's latest 30 days of work, labelled "if work resumes". The page today does the second, and `tools/check-pace.js` asserts it.
3. **The goal line**: "all 42 skills" of Unit 4 is out of reach for everyone. At the export the best student has mastered 20, has met 9 more without mastering them, and has not met 13. Mastering all 13 new ones would need far more than even the class's best first-week rate (57%, about 7 of 13), and weak skills rarely become mastered. A share of the goal, or ALPS's unit level, may be a fairer line.
4. **Fading** (optional): adding the class's measured rate at which mastered skills slip ranks students' gains better within a goal (0.20 against 0.02), but projects 0.4 skills too low on average. It is left out of the proposal.
5. **The learner model**: moving "mastered now" onto the learner model's scores (ALPS's own) would need those scores to be checked first. For this class they are flat.

## Files in this folder

| File | What it holds |
|---|---|
| [README.md](README.md) | This summary |
| [data-sources.md](data-sources.md) | Every table and field the method uses and why; the tables that were checked and not used, and why |
| [method.md](method.md) | The calculation step by step, the formulas, edge cases, and a worked example on the real class |
| [schemas.md](schemas.md) | Database table schemas, the input the calculation reads, and the output the page draws (with JSON) |
| [evaluation.md](evaluation.md) | How the methods were tested, all the results, and what each part of the method adds |
| [queries.sql](queries.sql) | Read-only SQL for every input, tested on section 218 |
| [backtest.js](backtest.js) | Reruns every number here: `node approach/on-pace/backtest.js` |
