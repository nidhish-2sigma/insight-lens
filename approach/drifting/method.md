# The method, step by step

How to work out, from the database, who is drifting, since when, and the signals beside each row. Steps 1 to 7 are the page's rule today (`js/atlas.js`, view 3). The SQL for each step is in [queries.sql](queries.sql). Changes that were tested are in [evaluation.md](evaluation.md).

## Words used here

- **First try**: the first answer a student gave to a graded question, on any unit of the book. Retries, opened pages and videos are not first tries.
- **Work**: the number of first tries in a stretch of days.
- **Day**: a day in the class's local time. The database stores UTC (step 2).
- **Today**: the day the page is read as of. It is the export date, or the day picked under "As of".
- **Block**: five days. Blocks count back from today: block 0 is today and the four days before, block 1 is the five days before that, and so on. So "the last five days" is always block 0.
- **Break**: a block in which nobody in the class tried a question. A block with class work is **live**.
- **Normal**: the student's usual work in a live block (step 4).
- **Low**: under half the normal.
- **The class's usual**: the middle of the class's total work in its earlier live blocks. The page uses it only in its message.
- **Judged**: the page names students only on days the class itself is working normally (step 6).

## Step 1. The work: one row per student and question

- For every student (query 1) and every graded question in the book's lessons: the day of the first try. This is query 3. On section 218 it gives 11,002 rows, between 191 and 532 per student (median 309).
- An answer is a row of `interaction_summary` with `action` = `check` or `code_run`, on a graded type (`mchoice`, `activecode`, `parsonsprob`, `parsonprob`, `fillintheblank`, `clickablearea`, `dragndrop`), not ignored, in an assignment that is not ignored. The first try is the earliest `timestamp` per student and question.
- **Why first tries**: a block's count is then the number of new questions a student took on. A student retrying one question twenty times did not do twenty questions' work.
- **Why any unit**: a student catching up on an earlier unit, or working ahead, is working. Only the book's lessons count, so the export and the page agree on the questions.

## Step 2. Local days

- The database stores UTC and no time zone. The export reads the class's offset from its own activity (query 2): over `student_activity_hour`, the quietest six hours of the day are taken to start at 1 am local. Section 218 gives **−4 hours**.
- A day is then `(timestamp + offset)::date`. Everything below is in these days.
- **Why**: a five-day block must not split a school day in two. One offset is used for the whole term, so a change of clocks moves late-evening work by an hour. That shifts at most a handful of answers to the next or previous day.

## Step 3. Five-day blocks, counted back from today

- A first try on day `d` falls in block `floor((today − d) / 5)`. Block 0 is the last five days.
- Each student's work per block, and the class's total per block (the sum over students).
- A block in which the class's total is 0 is a **break**. It is left out of everything below: it never counts against anyone, and it does not set a normal.
- **Why count back from today**: "the last five days" is then always a whole block, whatever day the teacher looks.
- **Why breaks come from the data**: the database holds no term dates (`section.term_start` and `term_end` are empty for this class), no timetable and no attendance. A stretch in which nobody worked is the only break the data can show.

## Step 4. Each student's normal

- The **lower median** of the student's work in the live blocks before the last two (block 2 and older). Live blocks in which the student did nothing count as 0.
- Three or more such blocks are needed. Before that the student has no normal and is not judged. On this class nobody has one until 23 Sep 2025, three weeks after the first answer.
- **Why the median**: one burst week (Christian's 65, below) does not lift the normal, and a slow week does not sink it.
- **Why leave out the last two blocks**: the fall being looked for must not drag down the normal it is measured against.
- **Why the student's own normal**: work differs a lot between students. On 15 Nov 2025 the normals run from 6 to 38 questions per five days (median 18). Against the class's middle, the same light workers would be named every week.

## Step 5. Low

- A student is **low** in a live block when their work in it is under half their normal: `work < normal / 2`.
- A student whose normal is 0 is never low.

## Step 6. The class guard

The page names nobody when:
- **nobody in the class worked in the last five days** (block 0 is a break). The page says "No class work from … ; the latest was on …".
- **half or more of the students with a normal are low in the last five days**. The class as a whole has slowed, and the page says, for example on 25 Nov 2025, "The class as a whole is working less: 33 of 36 are under half their normal in the five days to 25 Nov, so nobody is singled out."

**Why**: when the class slows (a holiday, a test on paper, a unit taught off the platform), most students fall under half their normal at once. Naming them would say nothing about any one of them. On this class the guard keeps the page quiet on 90 of the 156 days of the term, and without it the rule would name 1,040 student-days instead of 43 ([evaluation.md](evaluation.md)).

## Step 7. Drifting, since when, and working less

- **Drifting**: low in the last five days **and** low in the live block before them (the newest live block older than block 0, so a break in between is passed over).
- **Since**: walk back from block 0 over the live blocks while the student stays low. "Since" is the first day of the oldest block in that run: `today − (5 × its block number + 4)`, and never before the first week of work.
- **Working less**: low in the last five days only. The page lists these names on one line under the rows, not as rows.
- **Why two blocks**: one low block is often a few days off. On this class, in 21 of the 43 times a student was named, they were back over half their normal the very next day. With three blocks the page would have named 12 student-days in the whole term, and none of the 9 that could be followed was still low ten days later ([evaluation.md](evaluation.md)).

## Step 8. The line beside each row

- The student's work per block, oldest first, through the live blocks, against a band from half their normal to one and a half times it. Breaks are hatched, and the line does not run through them. A drifting student's run is drawn in red.
- Query 5 returns the line: one row per student and block, with the class's total (`class_n = 0` is a break).

## Step 9. The signals beside each row

Shown in red when they pass a threshold. Attendance is not recorded, so these stand in for it:

| Signal | How | Shown when | Query |
|---|---|---|---|
| Days with no work | Of the last five days, the ones on which the student touched nothing: no item and no graded attempt in `student_activity_hour` | 2 or more | 6 |
| Sets unfinished | Assigned sets (`coursework` with a due date, published or released) due in the 35 days to today, with no finished status in `coursework_status` (`completed`, `partially_graded`, `graded`, `returned` or `feedback_seen`). Rows with the same name and due day are one set | 2 or more | 7 |
| Accuracy | The average credit on questions first tried in the last 30 days, against the questions first tried before, in points. Five or more of each, else 0 | down 10 or more | 8 |

- **Credit** is the page's: a quick question earns 1 when right on the first try and 0.5 on the second; a code or Parsons task earns 1 within three tries and 0.5 within six. A question that eight or more students tried and nobody got right has no working check and is left out.
- On this class the first signal is on for three classmates in four as well ([evaluation.md](evaluation.md)), because the class works on the platform about three weekdays in five.

## Edge cases

- **The first weeks**: nobody has a normal until three live blocks lie before the last two. The page then says "Nobody is drifting below their own normal". It should say that it is too early to judge (see the README).
- **A student who joins late** has no normal for their first few weeks and is not judged. Their line says the normal is not known yet.
- **A student who usually does nothing** has a normal of 0 and is never low. They are not a drift: they never started. Other pages show them.
- **A near-break**: a block in which a few students worked is live, so it is judged like a normal week. This is the fault in [evaluation.md](evaluation.md) (15 Oct 2025): the block before had 28 first tries, 4% of the class's usual, and counted against everyone.
- **Today is the export date** and the class has stopped: the page names nobody and gives the day of the latest work. For a demo it opens on the latest day it can judge (19 Nov 2025 for this export).
- **Several books**: a book used for under four live blocks gives too little work to judge, and the page says so.
- **Accuracy as of a past day**: the page reads the export's summary of each question, so as of a past day it counts retries made after that day. Query 8 counts only tries made by then. Read as of the export date, the two agree.

## Worked example: 15 Nov 2025

The class's blocks, newest first:

| Block | Days | Class first tries | Share of the class's usual (664) | Under half their normal |
|---|---|---|---|---|
| 0, the last five days | 11 to 15 Nov | 540 | 81% | 9 of 36 |
| 1, the block before | 6 to 10 Nov | 394 | 59% | 8 of 36 |
| 2 | 1 to 5 Nov | 581 | 88% | 6 of 36 |
| 3 | 27 to 31 Oct | 1,475 | 222% | 2 of 36 |

Nine of 36 are low in the last five days, under half the class, so the page judges. It names nine students:

| Student | Normal | Half | 11 to 15 Nov | 6 to 10 Nov | 1 to 5 Nov | Status |
|---|---|---|---|---|---|---|
| Christian | 19 | 9.5 | 5 | 8 | 20 | Drifting since 6 Nov |
| Darren | 38 | 19 | 1 | 5 | 25 | Drifting since 6 Nov |
| John | 18 | 9 | 5 | 8 | 14 | Drifting since 6 Nov |
| Mariah | 20 | 10 | 1 | 8 | 49 | Drifting since 6 Nov |
| Antonio | 15 | 7.5 | 1 | 10 | 3 | Working less |
| Dylan | 19 | 9.5 | 2 | 21 | 0 | Working less |
| Travis | 6 | 3 | 1 | 9 | 24 | Working less |
| Yolanda | 16 | 8 | 1 | 9 | 0 | Working less |
| Yvette | 19 | 9.5 | 1 | 10 | 14 | Working less |

- **Christian's normal**: his 13 live blocks before 6 Nov (2 Sep to 5 Nov) hold 0, 2, 10, 12, 12, 16, 19, 20, 22, 24, 24, 31 and 65 first tries. The middle one, the 7th of 13, is **19**. Half is 9.5.
- He tried 5 in the last five days and 8 in the five before: both under 9.5, so he is drifting. The block before that (1 to 5 Nov) had 20, not low, so the run is two blocks long and starts on **6 Nov**.
- **Antonio** is low now (1) but was not low in the block before (10, over 7.5): working less.
- **The signals beside Christian**: no work on 3 of the last 5 days, and 3 sets unfinished, both shown. His accuracy is down 5 points, under the 10 that would show it.
- The class's line on the page: "4 students are drifting below their own normal."

Every row: `node approach/drifting/backtest.js --example 2025-11-15`. The day the rule goes wrong, with every block: `--example 2025-10-15`.

## The calculation in code

A sketch in plain terms. `first[i]` is the list of days on which student `i` first tried each question (query 3), counted from the first week of work, and `T` is today:

```js
function drifting(first, T) {
  const block = d => Math.floor((T - d) / 5);                                         // 0 = the last five days
  const W = first.map(ds => { const m = new Map(); ds.filter(d => d <= T).forEach(d => m.set(block(d), (m.get(block(d)) || 0) + 1)); return m; });
  const C = new Map(); W.forEach(m => m.forEach((n, b) => C.set(b, (C.get(b) || 0) + n)));
  const live = [...C.keys()].sort((a, b) => a - b);                                   // blocks with class work, newest first
  const median = v => v.slice().sort((a, b) => a - b)[Math.floor((v.length - 1) / 2)];   // the lower median
  const normal = W.map(m => { const v = live.filter(b => b >= 2).map(b => m.get(b) || 0); return v.length >= 3 ? median(v) : null; });
  const low = (i, b) => normal[i] !== null && (W[i].get(b) || 0) < normal[i] / 2;
  if (!C.has(0)) return { class: 'not working' };
  const judged = normal.filter(x => x !== null).length, lowNow = first.filter((_, i) => low(i, 0)).length;
  if (judged && lowNow >= judged / 2) return { class: 'slowed', lowNow, judged };
  return { class: 'judged', students: first.map((_, i) => {
    if (!low(i, 0)) return { i, status: normal[i] === null ? 'not judged' : 'normal' };
    let run = 0, oldest = 0; for (const b of live) { if (!low(i, b)) break; run++; oldest = b; }
    return run >= 2 ? { i, status: 'drifting', since: Math.max(0, T - 5 * oldest - 4) } : { i, status: 'working less' };
  }) };
}
```

[backtest.js](backtest.js) runs this calculation (with options for the variants tested) on every day of the term and checks it against the page. Query 4 is the same calculation in SQL.
