# The method, step by step

How to work out, for each student, the number of the goal's skills they will have mastered by the teacher's date. Steps 1 and 2 are what the page does today. Steps 3 to 6 replace today's projection.

## Words used here

- **Check**: one answer to a graded question that is tagged with the skill (relevance above 0.5), has a working check, and is not a lab. This is the page's evidence, unchanged.
- **Score**: the student's average credit on a skill's checks. When they meet the skill again 21 days or more after their first check, the later checks weigh 60%. Unchanged.
- **Mastered**: a score of 80% or more on two or more checks. This is ALPS's cut, and the page's rule today.
- **Met**: a student has met a skill from the day of their first check on it.
- **The class has met a skill**: from the day a quarter of the class has met it. With 36 students that is the 9th student's first check.
- **As-of day**: "today". It is the export date, or the day picked under "As of".
- **Goal date**: the teacher's "By" date.
- **Goal**: the skills a student must master for the target unit (step 1).

## Step 1. The goal (unchanged)

- The target unit's **key skills**: the skills its own summary, test, exercise and practice lessons check, that two or more lessons name and three or more questions check, or that a later unit needs.
- Plus the **earlier skills used**: skills earlier units of the same book teach that the target unit's lessons use, and that three or more questions check (not mostly Parsons puzzles).
- Each skill counted once, unstarted lessons included. This is `paceScope(u)` in `js/atlas.js`.
- Example: Unit 4 · Data Collections has 42 goal skills, 32 key skills and 10 earlier skills.

## Step 2. Mastered now (unchanged)

- `now` = the goal skills the student has mastered on the as-of day.
- Why keep it as it is: it is the same rule as every other page of the mock, and the projection only adds to it.

## Step 3. The class's schedule: how many goal skills the class will reach by the date

| Quantity | How | Example (Unit 4, as of 15 Nov 2025, goal date 15 Dec 2025) |
|---|---|---|
| met now | Goal skills the class has met by the as-of day | 28 of 42 |
| met 30 days ago | Goal skills the class had met 30 days before | 16 |
| pace | (met now − met 30 days ago) ÷ 30, skills a day | 12 ÷ 30 = 0.4 a day |
| left | Goal size − met now | 14 |
| reach | The smaller of *left* and *pace × days to the goal date* | min(14, 0.4 × 30) = 12 |

- **Why the class, not each student:** whether a skill can be mastered by the date depends first on whether the class reaches it. One schedule for the class keeps that part visible and lets the teacher question it.
- **Why 30 days:** it is the window the page uses today. In the test, 15 days was as accurate on average but its range held less often (74% against 79%), and 45 or 60 days were worse.
- **The page should say it**, for example: "At its pace of the last 30 days the class reaches 12 of the 14 skills left by 15 Dec. At that pace it reaches all of them by 20 Dec." The second date is the as-of day + left ÷ pace.
- **What-if, "If you teach the rest of the unit by your date":** reach = left. It answers the teacher's plan rather than forecasting the class.
- **No class work in the last 30 days** (a break, or an old export such as the page's default today): pace = 0, so nothing is added, and the page should say "The class has not worked since 5 Feb 2026". The alternative, using the class's latest 30 days of work labelled "if work resumes", is a decision for you (see the README).

## Step 4. Each student's share of the class's new skills

- **ahead** = goal skills that neither the student nor the class has met yet.
- **participation** = of all the skills the class has met so far (in any unit's goal), the share this student has met too.
- **new skills met** = the smaller of *ahead* and *reach*, × participation.
- **Why participation:** a student who skips work meets fewer of the class's new skills. In the example it runs from 0.74 to 1.00.
- **Why "ahead" caps it:** a student who worked ahead has already met some of the skills the class is about to reach, so fewer are new to them.
- Skills the class has met but the student has not, where they are behind, are not counted as caught up. Counting them at the class's catch-up rate made the test slightly worse.

## Step 5. Each student's first-week mastery rate

- Take every skill (in any unit's goal) the student met **at least 7 days before** the as-of day.
- **own rate** = the share of those they had mastered 7 days after first meeting them.
- **class rate** = the same over all students together. It was 34% in the example.
- **first-week rate** = (mastered + 10 × class rate) ÷ (met + 10). This pulls a student who has met few skills toward the class's rate.
- **Why a week:** mastery comes early or not much at all. Of the skills students met, 33% were mastered within 7 days, 34% within 15 and 39% within 30.
- **Why per student:** students differ widely and steadily, from 10% to 57%, and each has met about 61 skills, enough to measure.
- **Why 10:** with 60 skills met, the student's own rate carries 6/7 of the weight. With 5 met, the class's rate carries 2/3.

## Step 6. The projection and its range

```
projected = now + new skills met × first-week rate

spread    = √( new skills met × rate × (1 − rate)                          the new skills are a draw at the student's rate
              + min(ahead, reach) × (rate × participation)² )              and the class's schedule itself is uncertain
range     = projected ± 1.28 × spread, kept between now and the goal       an 80% range, shown rounded to whole skills
```

- **Mastered skills are kept** (no fading) and **weak skills are not counted as recovering**. Both were tested: learned from the class's history, the recovery rates came out about twice the term's real rates, and the projection ran 0.9 skills too high. The fading rate projected 0.4 too low and was worse when the schedule was known. See [evaluation.md](evaluation.md).
- In the test the range held the actual count 79% of the time, and 58% on the unit the class was in, where the schedule moves most.

## Step 7. Reading it against the goal

- The page's question is whether each student reaches the goal by the date. With the range, there are three answers: **reaches it** (the range's bottom is at or above the goal), **short** (its top is below the goal: say by how much), and **may reach it** (the goal is inside the range).
- The dotted "due by today" line (the goal spread evenly from the class's first meeting with a goal skill to the goal date) can stay as it is. It is a reference, not part of the projection.
- How a status maps to the page's groups and colours is a decision for you. On this class "all 42 skills" of Unit 4 is out of reach for everyone (see the README), so a line below "all of them" may be fairer.

## Edge cases

- **The goal date is the as-of day**: projected = now, and the range is empty.
- **A unit the class has not started**: the class's pace on its goal is 0, so the projection is now. The what-if shows what the plan would give.
- **A student who has met under 10 skills**: their rate is mostly the class's. The page could say so on hover.
- **A unit of labs**: no projection, as today. A lab is work, not a check.
- **Several books**: evidence comes from every book, so a level does not change with the book picked. The schedule comes from the goal's own book.
- **An old export or a break**: see step 3.

## Worked example: Unit 4, as of 15 Nov 2025, goal date 15 Dec 2025

The class (from step 3): it met 28 of the 42 goal skills by 15 Nov, 12 of them in the previous 30 days, so it reaches 12 of the 14 left by 15 Dec. The class's first-week rate is 34%.

| Student | Now | Skills met (a week+ ago) | Mastered within a week | First-week rate | Participation | New skills met | Projected | 80% range | Page today | Actual on 15 Dec |
|---|---|---|---|---|---|---|---|---|---|---|
| Andrew | 2 | 52 | 6 | 15% | 0.94 | 11.2 | 3.7 | 2.0 to 5.4 | 3 | 4 |
| Darren | 14 | 72 | 21 | 30% | 0.98 | 9.8 (worked ahead) | 16.9 | 14.7 to 19.1 | 20 | 14 |
| Karen | 18 | 55 | 26 | 45% | 0.98 | 11.8 | 23.3 | 20.4 to 26.3 | 26 | 19 |

- **Andrew**: (6 + 10 × 0.344) ÷ (52 + 10) = 15%. New skills: 12 × 0.94 ≈ 11.2, and 11.2 × 15% = 1.7, so 2 + 1.7 = 3.7. Actual 4.
- **Darren**: of the 14 goal skills the class had not met yet, he had already met 4, so only 10 can be new to him: 10 × 0.98 = 9.8. At 30% that adds 2.9, to 16.9. Actual 14.
- **Karen**: 45% of 11.8 adds 5.3, to 23.3. Actual 19.

**What happened:** the class met **1** of the 14 skills left, not 12. Its work fell from 1,500 first tries in 1 to 15 Nov to 431 in the second half of November and 244 in 1 to 15 Dec.

- **The schedule was the error, not the students' rates.** Given the true schedule, the method missed by 1.43 skills on this goal. At the class's pace it missed by 2.59, against 4.44 for the page today and 1.56 for no change.
- The range held for 21 of the 36 students. Karen's 19 fell below her range.
- This is why the page should say which schedule it assumes, and let the teacher change it.

Every student's row: `node approach/on-pace/backtest.js --example 2025-11-15 30`.

## The calculation in code

A sketch in the page's own terms (`EVD`, `estOf` and `paceScope` are the page's; `goalSkills` is every skill in any unit's goal):

```js
const mastered = (i, k, day) => { const e = estOf(i, k, day); return !!e && e.ev >= 2 && e.c >= 0.8; };
const firstCheck = (i, k) => (EVD[i][k] && EVD[i][k].length ? EVD[i][k][0].d : null);
const classMetDay = k => { const d = ALL.map(i => firstCheck(i, k)).filter(x => x !== null).sort((a, b) => a - b);
                           const q = Math.ceil(ALL.length / 4); return d.length >= q ? d[q - 1] : null; };

function project(u, goalDay, plan) {
  const goal = paceScope(u).ks, days = goalDay - TODAY, cm = Object.fromEntries(goal.map(k => [k, classMetDay(k)]));
  const metNow = goal.filter(k => cm[k] !== null && cm[k] <= TODAY).length;
  const metAgo = goal.filter(k => cm[k] !== null && cm[k] <= TODAY - 30).length;
  const left = goal.length - metNow, reach = plan ? left : Math.min(left, (metNow - metAgo) / 30 * days);

  // the class's first-week rate, and the skills the class has met, over every unit's goal
  const firstWeek = i => { let met = 0, m = 0; goalSkills.forEach(k => { const f = firstCheck(i, k); if (f === null || f + 7 > TODAY) return; met++; if (mastered(i, k, f + 7)) m++; }); return { met, m }; };
  const all = ALL.map(firstWeek), classRate = all.reduce((a, o) => a + o.m, 0) / Math.max(1, all.reduce((a, o) => a + o.met, 0));
  const classMet = goalSkills.filter(k => { const d = classMetDay(k); return d !== null && d <= TODAY; });

  return ALL.map(i => {
    const now = goal.filter(k => mastered(i, k, TODAY)).length;
    const ahead = goal.filter(k => firstCheck(i, k) === null && !(cm[k] !== null && cm[k] <= TODAY)).length;
    const part = classMet.length ? classMet.filter(k => firstCheck(i, k) !== null).length / classMet.length : 1;
    const rate = (all[i].m + 10 * classRate) / (all[i].met + 10);
    const meet = Math.min(ahead, reach) * part, projected = now + meet * rate;
    const spread = Math.sqrt(meet * rate * (1 - rate) + Math.min(ahead, reach) * (rate * part) ** 2);
    return { i, now, projected, low: Math.max(now, projected - 1.28 * spread), high: Math.min(goal.length, projected + 1.28 * spread) };
  });
}
```

[backtest.js](backtest.js) runs this same calculation on the real class as of past days, and compares it with what happened.
