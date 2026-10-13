# Insight Lens: every component of every page, seen by a teacher for the first time

A review of `index.html` as it renders on 13 October 2026, on the real class (36 students, one book). I loaded every page, hovered every mark, opened every control a teacher would reach, followed a student across the pages, opened a profile and built a practice set: 137 pictures of 137 states, at 1440 × 900 and at phone width. I then measured each screen: words a teacher sees before scrolling (chart labels included), controls, marks, keys, page height. Every number below was read off those pictures or the live page; nothing is taken from the README or the code.

The yardstick is the one you set: a teacher who has never seen the pages should take in every page in **2 to 3 minutes, all pages together**, and the pictures should be chosen so that not everything is presented at once.

## Verdict

**Today the pages take about four times the budget.** The eleven first screens hold 2,838 words (chart labels included), 349 visible controls, seven kinds of chart and about sixty status words, with 1,021 more words of "How to read". Read at a scanning pace of four words a second, that is twelve minutes before a single picture is understood. The budget is 150 seconds: fourteen seconds a screen.

**What already works for a first look** (keep, do not touch):

- Every page opens on one question and one answer sentence with numbers in it.
- Every page ends in a button that does something a teacher does: Check in, Message home (with a draft), Reteach in a small group, Plan a reteach, Make it a required check, Schedule a review, Accept plan, Generate practice. Everything logs to one list.
- Nine of eleven pages key their marks on the page. The Drifting page and the "What to do first" cards on Ready for a unit are the model: one picture, a key, names, a button.
- Following a student carries them across pages, and the profile is a one-screen summary.

**What stands between a teacher and the three minutes** (the cuts, in order of effect):

1. **The Overview is a 36-row gradebook** with 72 sparklines, 108 unit cells, 83 numbered chips and 30 buttons, and no key for any of its marks. Only 14 rows fit on a screen.
2. **Three pages say the same thing.** Shared weak skills, Hardest content and Fading skills all open on *Class Instantiation in Java* with the same 27 students "not yet". A teacher reads it three times.
3. **The rail's numbers read as counts.** "Overview 1 · Effort and mastery 3 · Drifting 4 · On pace 9" look like notification badges; they are page priorities, explained only on hover. The same numbers are the "Flagged in" chips on the Overview and the flags in the following bar.
4. **"Now" is week 12, but the pages say today is week 16.** Eight students show "0%" weekly work on the Overview; the figure is for the last week with new class questions (week 12), four weeks before the footer's "week 16". Nothing on the page says which week.
5. **Invented rows read as facts.** What worked's headline, "2 things worked", counts two invented sample rows; 18 of 36 real profiles carry an invented "moment".
6. **Empty things take the space of real ones**: 7 of 10 grid columns on Effort and mastery are not started, 9 of 13 unit buttons on Ready for a unit, 10 "Not started" chips on two outlines, and the Stall points "Content" level is a 17,709-pixel wall of 2,578 words.
7. **Each page has its own vocabulary** for the same ideas: "Short of goal" on one page is "Short, not catching up" on the next; "Not yet" is also "Gave up", "Not secure", "Faded", "Slipped", "Below your line".

Section 4 takes up the two points you raised about On pace: that a teacher judges a unit by its hard skills, not by a count, and that the goal is a unit. Section 5 has the set of components I would keep for the first look, with a sketch, and section 6 the decisions that are yours.

## 1. How much there is to take in

Words a teacher sees without scrolling at 1440 × 900 (chart labels included), the words of "How to read", visible controls, and the reading time at a scanning pace of four words a second.

| Page | Words on the first screen | How to read | Controls visible | Page height | Reading time |
|---|---|---|---|---|---|
| Overview | 348 | 148 | 92 | 2,147 px | 87 s |
| Effort and mastery | 376 | 225 | 15 | 2,083 px | 94 s |
| Drifting | 209 | 53 | 21 | 1,085 px | 52 s |
| On pace | 338 | 96 | 39 | 942 px | 85 s |
| Shared weak skills | 303 | 102 | 48 | 970 px | 76 s |
| Stall points | 219 | 74 | 42 | 959 px | 55 s |
| Hardest content | 225 | 73 | 45 | 900 px | 56 s |
| Fading skills | 186 | 92 | 14 | 900 px | 47 s |
| Ready for a unit | 219 | 84 | 16 | 1,067 px | 55 s |
| What worked | 316 | 74 | 11 | 1,283 px | 79 s |
| A profile | 99 | 0 | 6 | 900 px | 25 s |
| **All eleven** | **2,838** | **1,021** | **349** | | **711 s ≈ 12 min** |

A teacher does not read every word. But the pictures carry seven different grammars (a sparkline table, a pill grid with a scatter, lines in bands, dumbbell tracks, area rows, stacked-bar outlines, a ring tree, effect ranges), and each grammar has to be learned once from its key before the picture says anything. Fourteen seconds a screen buys one sentence, one picture of five or fewer keyed marks, and the names and the button. That is the budget each page is held to below: **under 80 words, one picture, five keyed marks, six controls, and the action above the fold.**

## 2. Page by page

Each table takes the page's components in the order a teacher meets them. "Reads as" is what a first-time teacher would take the component to mean, measured against what it actually means. The verdict is one of **keep**, **simplify**, **fold** (keep it one click away), **merge**, **cut**.

### Overview · "How is each student doing?"

![The overview, first screen](img/review-overview-first.png)

| Component | What is there | Reads as | Can a teacher act? | Verdict and change |
|---|---|---|---|---|
| Answer line | "4 drifting, 8 stuck despite effort, 18 short of the goal." | Three alarms. "Drifting" and "stuck despite effort" are this product's terms, undefined here; "the goal" is 77 skills, set on another page as the class's middle, so by construction about half the class is short of it. | No: no names, no step. | **Simplify.** Say who and what first: "4 drifting (Dylan, Mariah, Christian, Joan): check in. 8 stuck in Data Collections: small-group reteach." Drop "short of the goal" from this line until the goal is a unit (section 4). |
| The table, 36 rows × 7 columns | 1,784 px tall; 14 rows fit a screen; sorted by number of flags. | A gradebook. | Yes, through the Next step column, after scrolling. | **Simplify.** Open on the students with a step to take (24 today), one line a student; fold the other 12 ("12 students with nothing to do first"). Four columns at most. |
| Weekly work: sparkline + figure | 36 sparklines with a gray band and a red segment; 8 figures read "0%", 7 of them red. | "Did nothing this week." It is the share of week 12's class work, the last week in which the class met new questions; the footer says today is week 16. The gray band (the student's normal range) and the red segment are not keyed on this page. | No. | **Simplify.** Put the week in the header ("Week 12's work") and key the band and the red line, or drop the sparkline here (the profile has it) and keep the figure. |
| Skills secure: sparkline + figure + arrow | Figures from 11% to 51%; green arrows on 8 rows. | "19% of skills secure" of an unknown total (it is 100 taught skills), with no class figure beside it (the class average is 27). The arrow means two points or more in four weeks; unkeyed. | No. | **Cut** the sparkline and the arrow from the first look; keep "19 of 100" as text, or leave the figure to On pace. |
| By unit: three cells a student | 108 small pills in three greens, a thin gray or red line under each, a red dot on some; header "By unit 1 2 4". | Green is good, red is bad; the shades, the line and the dot have no key on this page (the Effort page keys them). "1 2 4" under "By unit" can be read as counts. | Clicking a cell opens Effort and mastery on that unit, with the student followed: nobody would guess that. | **Keep** as the one picture per row, and **add the key** above the table (the five marks of the Effort page). Name the units in the header ("Unit 1 · Unit 2 · Unit 4"). |
| Pace: a word in a pill | "Short of goal" 16, "On pace" 11, "Ahead" 7, "Catching up" 2. | Clear words. "Catching up" is the only one that needs a second look (short, but catching up). | No. | **Keep.** Use the same words on the On pace page (see there). |
| Flagged in: numbered chips | 83 chips, "2 3 4 5 8 9" in red and amber. | Scores, or counts, or grades. They are the priorities of the pages that flag the student, and a click opens that page with the student followed. | Only by accident. | **Cut.** Keep the count as the sort order; if a hint is wanted, one word ("6 pages") with the names on hover. |
| Next step: a button | Check in 7, Small-group reteach 7, Talk to them 6, Stretch task 6, Generate practice 4, none 6. | The one thing to do. Clear. "Check in" logs itself as done at once ("Logged: Checked in with Ashlee") and turns into a green "Logged" pill: it reads as "mark done", not "do". | Yes. | **Keep.** Make the button say what it does in this mock ("Log a check-in"), or open the message draft as Drifting does. |
| Sorting by headings | Arrows on the sorted heading. | Standard. | Yes. | **Keep.** |
| How to read | 148 words, opened by a link; the only place the marks of this page are explained. | A paragraph to study. | – | **Simplify** to 40 words once the key is on the page. |
| The following bar (after a chip) | "FOLLOWING Dylan · 3 None of the latest week's work · 4 Drifting since week 11 · 5 4 of 4 gaps · Unit 4 · 8 Slipped on 12 of 33 skills · 9 Short, not catching up · Open profile · Stop following" | A useful one-line summary of a student across pages; the numbers are the rail's priorities again. | Yes: each flag opens its page. | **Keep**; show the page name instead of the number. |

### Effort and mastery · "Who is doing the work, and is it turning into mastery?"

![Effort and mastery, first screen](img/review-effort-first.png)

![Effort and mastery, the whole page](img/review-effort-full.png)

| Component | What is there | Reads as | Can a teacher act? | Verdict and change |
|---|---|---|---|---|
| Answer line | "Data Collections: 6 stuck despite effort, 5 not doing the work." | Concrete: a unit, two numbers. | Not from the line. | **Keep.** |
| Trail and pager | "All units ‹ 1–10 of 13 units ›" | The course has 13 units; the page shows 10 at a time. | Yes. | **Simplify**: with started units only there is nothing to page. |
| Slider "Doing the work: at least 60% of practice" | Moves the line; at 80% the answer becomes "5 stuck, 7 not doing the work". | A setting a first-timer cannot judge, and the first control on the page. | It changes who is in the groups. | **Fold** under a "Your line" link. The default is fine. |
| Sort select | By name, Stuck first, Not doing the work first. | Standard. | Yes. | **Fold.** |
| The key | "Not yet → secure · Too early · Practice done · Under your line · Stuck despite effort" | Five marks, five words: the model for the other pages. | – | **Keep.** |
| The grid, 36 × 10 | 1,057 px; 3 columns started, 7 hatched and empty under gray headings; the signal is 13 red dots and 14 red lines among 108 green pills. | A wall of green; the eye has to hunt for red. The seven empty columns say "nothing here" ten times. | Clicking a heading drills into subunits; clicking a not-started heading (4.1) opens an empty level that says "Nothing to place here yet", a dead end. | **Simplify.** Show started units only ("+10 not started" as a chip, like the profile). Not-started headings are not clickable. Put the grid *under* the picked unit's chart and cards, or fold it ("Every student by unit"). |
| Class row and the per-student summary bar ("Secure, of 100 skills") | A split bar per column and a split bar plus a count per student; "Class trend · share secure 47% 53% 41%" at the foot with arrows. | Three more encodings on the same picture; the trend row needs its own sentence in How to read. | No. | **Cut** the trend row and the per-student bars from the first look; the Class row can stay. |
| The scatter | 36 dots on practice tried × mastery, five named regions, names on the problem dots. | Once the regions are read, "bottom right is stuck, bottom left isn't working" is clear; the region names repeat the cards beside it. | Clicking a dot follows the student. | **Keep** as the page's one picture, above the grid. |
| Three cards | "Stuck despite effort · 6" + names + Reteach in a small group; "Not doing the work · 5" + Talk to them; "Coasting · 2" + Offer a stretch task. | The answer in people and a button each. The best part of the page, at 1,406 px from the top: below the fold. | Yes; logging says "It now waits in What worked as in progress". | **Keep**, first. |
| "drifting" beside a name | A red word on three rows. | A cross-page tag; unkeyed here. | No. | Keep; it is one word. |
| How to read | 225 words, the longest in the mock. | A page of its own. | – | **Simplify** to 60. |

### Drifting · "Who is drifting, and since when?"

![Drifting, first screen](img/review-drifting-first.png)

| Component | What is there | Reads as | Can a teacher act? | Verdict and change |
|---|---|---|---|---|
| Answer line | "4 students are drifting below their own normal." | Clear. | – | **Keep.** |
| Axis header | "Wk 1 · Wk 8 · Wk 12 · Wk 16 · Gray band: normal range" | A key, on the page, in nine words. | – | **Keep.** |
| A row a student | Name, "Since week 11", a line that turns red with a dot where it drops, red chips ("No work on 5 of 6 class days", "3 sets unfinished", "Accuracy −16 pts"), three buttons. | "Dropped off at week 11, here is why, here is what to do": the clearest row in the mock. Two things mislead: the dashed vertical at week 8 (the end of the weeks the normal range is taken from) is not keyed; and the red line runs flat from week 12 to week 16, which reads as four weeks of nothing, when weeks 13 to 16 had no class work and carry week 12 forward (How to read says such weeks are "skipped", but they are drawn). "Doing less each week" is shown when no signal fires; it reads as a diagnosis. | Yes. | **Keep.** Stop the line at the last week with class work, or hatch the weeks without any. Key the dashed line or drop it. Replace "Doing less each week" with the figure ("week 12: 0% of class work, normal 60–100%"). |
| Check in · Message home · Not a concern | Check in logs and turns green; Message home opens a draft with Copy text, Mark as sent, Cancel; Not a concern removes the row and offers Undo. | Exactly what they say. | Yes. | **Keep.** This is the pattern for every action in the mock. |
| "One low week" rows | Three rows with dashed borders, an amber pill and a yellow dot, no buttons. | "Watch these": fine, but three more charts to read. | No. | **Fold** into one line: "3 more had one low week: Ashlee, Justin, Ray". |
| Show the other 29 students | 29 mini sparklines with names. | Everyone else is fine. | Clicking one follows the student. | **Keep folded.** |

### On pace · "Is each student on pace to reach the goal?"

![On pace, first screen](img/review-pace-first.png)

| Component | What is there | Reads as | Can a teacher act? | Verdict and change |
|---|---|---|---|---|
| Answer line | "18 students will miss the goal of 77. 16 aren't catching up." | Half the class is failing. "77" is a number of skills nobody set: the class's own median projection, so half are below it by construction. | No. | **Simplify.** Section 4: make the goal a unit and judge standing by the unit's key skills. Until then, say what the goal is in the sentence: "By week 36, 18 students are projected below the class's middle (77 skills)." |
| Goal slider and sort | "Goal by week 36 · 77 skills"; By status, projection, name. | A setting to fiddle with before the chart is understood. | It redraws everything live. | **Fold.** |
| The key | Five statuses and "Projected". | Five words for one scale: "Short, not catching up", "Short, but catching up", "Ahead now, but slowing", "On pace", "Ahead". The Overview says "Short of goal", "Catching up", "Slowing", "On pace", "Ahead" for the same five. | – | **Simplify**: one set of words on both pages. |
| Two charts side by side | 36 tracks: a solid bar (secure now), a dotted bar (projected), a ring (where it lands), "19 → 26"; a "Due by today: 34.2" line and a "Goal: 77" line on each. | Solid is now, dotted is later: readable after the key. "Due by today: 34.2" is a fraction of a skill. The axis runs to 210 while the largest projection is 157 and most are under 100, so most tracks sit in the left third. | Clicking a track follows the student. | **Simplify.** One chart; open on the two "Short" groups (18 rows) and fold the rest ("18 on pace or ahead"); axis to 160; round "due by today" or drop it. |

### Shared weak skills · "Which skills are many students weak in, and is that changing?"

![Shared weak skills, first screen](img/review-weak-first.png)

| Component | What is there | Reads as | Can a teacher act? | Verdict and change |
|---|---|---|---|---|
| Answer line | "26 skills are weak for a fifth of the class or more; 5 are improving." | A count, no "which first". | No. | **Simplify**: name the one to reteach first and how many it touches: "Class Instantiation in Java first: 27 of 36 not yet secure." |
| Filter tabs | All · 31, Still weak · 26, Improving · 5, Recovered · 0. | Fine. "Recovered · 0" is a button for nothing. The full list also shows a fourth status, "Getting worse", which has no tab. | Yes. | **Simplify**: hide empty tabs; make the statuses and the tabs the same set. |
| The key | One entry: the red area, "share of the class not yet secure, week by week". | Enough for the picture. | – | **Keep.** |
| A row a skill (11 shown of 31) | Name, a small red area across weeks 1 to 16 under "Unit 1 · Unit 2 · Unit 4" bands and a "Today" line, a bar and a count ("27"), a status word. | "27 not yet secure, and the area rising means getting worse": readable. The status word is printed on every row (11 times on the first screen) when the rows are already grouped by it. | Clicking a row changes the panel. | **Keep** the rows; **cut** the per-row status word and use a group heading instead ("Still weak · 8"). |
| The panel | Skill, status pill, "1.20 · 30 questions", Plan a reteach, Where they stall →, a red/amber/green bar "27 not yet · 9 developing · 0 secure", 27 names. | "1.20 · 30 questions" is a lesson code with no label. The rest is clear and the button is right. | Yes. | **Keep**; label the lesson: "Introduced in 1.20 Unit Summary 1b · 30 questions". |
| Show all 31 | The full list, 1,640 px. | More of the same. | – | **Keep folded.** |

### Stall points · "Where do students stall, skip or give up?"

![Stall points, first screen](img/review-stall-first.png)

| Component | What is there | Reads as | Can a teacher act? | Verdict and change |
|---|---|---|---|---|
| Answer line | "29 gave up at Modulo Operation Patterns (2.19); 27 skipped Weighted Level Score Calculation (1.26)." | Two questions, two numbers: the most concrete answer in the mock. | Not from the line. | **Keep.** |
| Show Units · Subunits · Content, and Sort | Three levels of the outline. "Content" opens every question of every started unit: 17,709 px, 2,578 words, 434 controls. | At "Units", three pooled bars that say little; at "Content", a wall. The question the headline names is not on the first screen at any level but Content. | Yes. | **Simplify.** Open on the worst questions as one ranked list (five to eight rows: question, lesson, who gave up, who skipped). Keep the outline as the second view, opened one unit at a time. |
| The key | Gave up, Skipped, Needed retries, First time. | Four words, four colours. | – | **Keep.** |
| Unit rows | Three stacked bars with "Gave up %" and "Skipped %": 2% and 29%, 1% and 8%, 5% and 19%. | "29% skipped Unit 1" reads as 29% of students; it is the share of all answers in the unit's questions. | Clicking opens the unit. | **Fold** into the outline view. |
| "Not started" chips | Ten units named in dashed chips. | Noise on a page about where students stall. | No. | **Fold.** |
| The panel | Question, code, "Stall point" pill, one button ("Add a worked example first" or "Make it a required check"), names by outcome. | Clear; the button is a real teaching move. | Yes. | **Keep.** |

### Hardest content · "Which units, subunits and skills are hardest?"

![Hardest content, first screen](img/review-hardest-first.png)

| Component | What is there | Reads as | Can a teacher act? | Verdict and change |
|---|---|---|---|---|
| Answer line | "Hardest unit: Using Objects and Methods. Hardest skill: Class Instantiation in Java." | The same skill, the same 27 students, as Shared weak skills and Fading skills. | No button on this page but "Where they stall →". | **Merge** (section 6): this page is the "by unit" view of the skills page. |
| Show Units · Subunits · Skills, and Sort | "Skills" opens the whole tree: 1,253 words, 219 controls. | Another outline. | Yes. | With the merge, the outline becomes the second view. |
| The key | Not yet, Developing, Secure. | Fine. | – | **Keep.** |
| ▲ beside unit and lesson names | Three on the first screen; the tooltip says "2 skills have no item that checks them". | An alert of some kind; not in the key. It is a note about the item bank, not about the students. | No. | **Cut** from the teacher's view; keep in How to read. |
| Unit rows | Red/amber/green bars with "Not secure 59% · 59% · 47%". | "Most of the class is not secure in every unit": true, and alarming without the time dimension (Unit 1 was taught in weeks 1 to 3; its skills have faded). | – | Merge. |
| The panel | Skill, "100% not secure", lesson, 27 + 9 names, no action. | The same panel as Shared weak skills, minus "Plan a reteach". | Weaker than the sibling page. | Merge. |

### Fading skills · "Which skills fade after they're taught?"

![Fading skills, first screen](img/review-fading-first.png)

| Component | What is there | Reads as | Can a teacher act? | Verdict and change |
|---|---|---|---|---|
| Answer line | "7 of 34 rechecked skills faded, most of all Class Instantiation in Java." | The third page to name this skill. | Not from the line. | **Merge**, or make the answer carry what only this page knows: "Class Instantiation in Java was 71% when taught and is 10% now: forgotten, not never learned." |
| Unit buttons, sort, "Show all 34" | Four unit buttons, a sort, a checkbox. | Standard. | Yes. | **Fold** the sort; keep the checkbox. |
| The key | "○ When taught · ● Later: down 8+" (+ Steady, Grew when all are shown). | Two marks, enough. | – | **Keep.** |
| Seven rows | Dumbbells from the open dot to the red dot on a 40–100 axis; columns "Change" (−62 …), "Slipped 20+" (23 …), "Built on now" (one entry: "Unit 4"); a red bar at the left of every row. | "Was 71%, now 10%, 23 students slipped": the one insight no other page has. "Built on now" is a cryptic header for a column with one value; the red bars repeat the red dots. | Clicking a row opens the scatter. | **Keep** the picture; rename the column ("Needed in Unit 4"); drop the left bars. |
| The panel | A scatter of every student (when taught across, later up), "Slipped 20+ points · 23" with names, Schedule a review. | Readable with its own labels; the button is right. | Yes. | **Keep.** |

### Ready for a unit · "Is the class ready for each unit, and what first?"

![Ready for a unit, first screen](img/review-ready-first.png)

| Component | What is there | Reads as | Can a teacher act? | Verdict and change |
|---|---|---|---|---|
| Answer line | "Data Collections: reteach Iterate Over Array Elements first." | Action first: good. But Data Collections is the unit the class is *in* (weeks 11 to 15), so "ready for" is in the past tense. With Unit 2 picked (finished in week 10) the page says "reteach Modulo Operator first" and lists 12 students "ready to go further" for a unit that is over. | Yes. | **Simplify.** Open on the next unit, and since the data holds no plan, ask: "Which unit do you teach next?" with the started units marked. |
| Unit buttons | 13, "Unit 4 · latest" picked; 9 are not started. | A row of numbers. Here the not-started units are the point. | Yes. | **Keep**; mark started and next. |
| Readiness line slider | 60% secure. | A setting. | It recolours the rings. | **Fold.** |
| The key | Below your line, Under 80%, Ready, Your line (and Not taught yet when it applies). | Four marks, one word each. | – | **Keep.** |
| The tree | The unit in a box, four rings with a percentage and a tick for the line, skill names under them. | "8% of the class is secure on the first thing this unit needs": clear. | Hovering gives the count and the lesson. | **Keep.** |
| What to do first | Three cards: Reteach to everyone (skills with %), Small groups (names), Ready to go further (names, removable); Accept plan, Undo. | The clearest "what can I do" block in the mock. | Yes; "Plan accepted. 4 actions logged." | **Keep.** |

### What worked · "Did what I did work?"

![What worked, first screen](img/review-worked-first.png)

| Component | What is there | Reads as | Can a teacher act? | Verdict and change |
|---|---|---|---|---|
| Answer line | "2 things worked: the if-statement reteach and Parsons warm-ups." | Two successes. Both are invented sample rows; the one real row (Unit 4A Array Review, week 15) is "too early to tell". | No. | **Simplify.** The headline must count real rows only: "Too early to tell for the one set you targeted (Unit 4A Array Review, week 15)." |
| Filter and key | All · 7, Worked · 2, Not proven · 5; Worked, Promising, No clear effect, "Sample · invented rows, to show the chart". | The key says sample rows are invented; the headline says they worked. | – | Keep the key; fix the headline. |
| The chart | Seven rows: a dot and a range on a −10 to +25 axis, "← hurt · helped →", a verdict word; six rows marked "sample" in small gray type. On the real row, "Not enough later work to compare yet" (x 625–826) runs into "Too early to tell" (x 793–875). | Readable; the two texts overlap. | Clicking a row opens the panel. | **Simplify**: fence the sample rows off (dashed box, "invented") or hide them behind "Show sample rows"; fix the overlap. |
| The panel | Name, verdict, "Sample", a recommendation ("Keep it."), the dose and the comparison. | Clear. | – | Keep. |
| Action log | Time, page, text, "In progress" or "Done" for everything logged. | Exactly what was done today. | – | **Keep**, and make it the page: "My actions", with the effect chart appearing when a real set has later work. |
| Sample rows elsewhere | 18 of 36 real profiles show an invented moment ("Messages home about unfinished sets (sample)"); with Brent followed, "Brent did this" appears under invented rows. | Invented facts about real students. | – | **Cut**: never attach a sample row to a student. |

### A profile

![A profile, first screen](img/review-profile-first.png)

| Component | What is there | Reads as | Can a teacher act? | Verdict and change |
|---|---|---|---|---|
| The following bar | Up to seven flags with priority numbers; Open profile; Stop following. | A good summary; the numbers again. | Yes. | Keep; page names, not numbers. |
| Three figures | "Skills secure 19 of 100", "Latest week's work 0%", "Pace: Short, not catching up". | Clear, except which week "latest" is. | – | Keep; name the week. |
| Unit chips | "Using Objects and Methods · Keep going", "Selection and Iteration · Keep going", "Data Collections · Stuck despite effort", "+10 not started", each with the grid's small mark. | Where the student is in each unit, in words: good. The small marks are unkeyed here. | Clicking opens the grid on that unit. | Keep; the words carry it. |
| The timeline | One chart: secure share (green), weekly activity (gray), the normal band, unit bands, moments as dots; a five-entry key. | One picture, keyed: the model. The activity line falls to 0 at week 13 and stays there to 16 for the same reason as on Drifting. | Hovering a dot gives the moment. | Keep; same fix as Drifting. |
| Moments | "Wk 4 Slipped on …", "Wk 5 Slipped on …", "Wk 9 Messages home about unfinished sets (sample)". | A short history; the invented one reads as real. | – | Cut sample moments. |
| Generate practice | A set of one item ("1 item · about 3 min"), time buttons, remove, "Why these items" (six items left out as too hard or broken), Assign. | A thin set, honestly explained. | Yes. | Keep. |

### Across the pages

| Component | What is there | Reads as | Verdict and change |
|---|---|---|---|
| The rail | Three groups; numbers 1, 3, 4, 9 · 2, 6, 7, 8 · 5, 10 in badges; "PRIORITY" in small capitals; a one-line purpose for each page on hover ("Priority 3 of 10: who needs a reteach, and who needs a nudge"). | Badges with counts, out of order. The one-line purposes, the best short explanation of each page, are hidden in a hover. | **Cut the numbers**; the order can carry the priority. The purposes belong in a first-visit hint, not a hover. |
| Top bar | Class name; "See an example with three more books" (a blue link); "Mock · real class data"; Action log; avatar. | The link and the chip are demo chrome; a teacher does not know what an "example with three more books" is. | **Fold** the demo link into the footer; drop "Mock · real class data" for teacher-facing demos. |
| How to read | On every page; 1,021 words in all; on the Overview it is the only key. | Homework. | ≤ 50 words a page; marks keyed on the page. |
| Footer | "Anonymised class data, 1 Sep to 21 Dec (week 16). Nothing here is saved." | The only place "today" is defined. | Keep; add "latest class work: week 12". |
| Where the numbers come from | A table of pages, formulas and database tables, collapsed. | For the builder. | Keep collapsed; rename the "Database tables" column away from the teacher view. |
| Tooltips | Sixty or more on the Overview alone. | Extra, never the only explanation on nine pages; the only one on the Overview. | Keep as extra. |
| Phone width (390 px) | The Overview shows three of seven columns; Next step is off-screen; the class name is "AP…"; Shared weak skills and Ready for a unit scroll sideways. | Not usable for a scan. | Decide the scope (section 6). |

## 3. Vocabulary

Status words a teacher meets on the first screens, by page. Each is a term to learn.

| Page | Words |
|---|---|
| Overview | drifting, stuck despite effort, short of the goal, catching up, ahead, on pace; Check in, Small-group reteach, Generate practice, Talk to them, Stretch task |
| Effort and mastery | not yet, secure, too early, practice done, under your line, stuck despite effort, on track, keep going, coasting, not doing the work |
| Drifting | since week N, one low week, doing less each week, no work on X of Y class days, sets unfinished, accuracy −N pts, not a concern |
| On pace | short not catching up, short but catching up, ahead now but slowing, on pace, ahead, projected, due by today, goal |
| Shared weak skills | still weak, getting worse, improving, recovered, not yet now, not yet, developing, secure |
| Stall points | gave up, skipped, needed retries, first time, stall point, often skipped |
| Hardest content | not yet, developing, secure, not secure, no item checks it, too few checked yet |
| Fading skills | when taught, later, down 8+, steady, grew, slipped 20+, built on now, change |
| Ready for a unit | below your line, under 80%, ready, your line, not taught yet, reteach to everyone, small groups, ready to go further |
| What worked | worked, promising, no clear effect, too early to tell, sample, hurt, helped |

About sixty terms. The same idea has up to five names: a student who is not secure is "not yet", "not secure", "below your line", "slipped", "faded"; a student doing poorly on pace is "short of goal" here and "short, not catching up" there. One shared set would do: **secure · developing · not yet** for a level; **doing the work · not doing the work** for effort; **drifting**; **stuck**; **short of the goal**; **ready · not ready**. Everything else is a page's own refinement and can live in its panel.

## 4. Pace: count the skills that matter, and set the goal in units

Two points you raised, in your words: a teacher takes a student to know a unit when they are proficient in, or have mastered, its hard skills, not when they have secured some number of skills; and the goal is a unit, not a count. Both are right, and the numbers below, worked out on this class from the page's own levels, say how much they change.

### What the page does today

- **Every taught skill counts alike.** The class has met 100 skills in 16 weeks; the page continues that rate to 225 by week 36 and sets the goal at 77, the class's median projection. A student's status comes from the count secure now against "due by today" (34.2) and the recent rate.
- **So a student secure on twenty easy skills outranks one secure on a unit's eight hard ones**, half the class is short of the goal by construction, and "77" is nobody's target. The Overview repeats it ("18 short of the goal"), the profile shows "Skills secure 19 of 100", and the grid's cells average mastery over every listed skill of a unit the same way.
- **The rate is read from weeks 10 to 16**, four of which had no class work, so the projection says more about the calendar than about the student.

### Which skills are a unit's key skills

Three ways to pick them, measured on this class. "Listed" is every skill the unit's lessons name in the export.

| Rule | What it takes | Unit 1 | Unit 2 | Unit 4 (in progress) | Unit 3 (not started) |
|---|---|---|---|---|---|
| Skills listed | everything the unit's lessons name | 73 | 77 | 152 | 53 |
| A · Assessed | skills the unit's own summary, test, exercise and practice lessons check (10 of unit 1's 27 lessons, 15 of unit 2's 31, 24 of unit 4's 71) | 21 | 33 | 50 | 18 |
| B · Carried forward | skills two or more lessons name and three or more questions check, or that a later unit builds on | 25 | 37 | 63 | 20 |
| **A and B · key skills** | assessed by the unit, and carried forward | **14** | **18** | **32** (8 checked so far) | **14** |
| … of which hard | the bottom third of the key skills by the class's share secure | 5 | 5 | 3 | – |
| C · Hardest alone | the bottom third of all the unit's checked skills | 9 | 13 | 8 | – |

The book's own tests say what a unit is for; reuse says the skill carries forward; together they give a short list a teacher would recognise. Unit 1's fourteen: Modulo Operation, Produce Console Output, Output Statements, Modulo Operator, Constructors, Java Class Definition, Draw Shapes with Java Graphics, Substring Operations, String Comparison Methods, Compare Java String References, Class Instantiation in Java, Calculate Aggregated Values from Data, Aggregate Values in Collection, Method Return Type. Its hard five: Class Instantiation in Java (0% of the class secure), Constructors (8%), Draw Shapes with Java Graphics (13%), Aggregate Values in Collection (21%), Java Class Definition (22%). Unit 2's hard five: Methods in Classes, Trace Variable Changes in Loops, Loop Output, Nested For Loops, Modulo Operator.

"Hardest by results" alone (rule C) is circular for a goal: a skill nobody has would be required because nobody has it. It is the right lens for *mastered*, not for picking the list. The list should be the teacher's to edit: a tick-list a unit, starting from A and B.

### Standing in a unit, from its key skills

Four words, from the key skills the class has been checked on so far: **mastered** (secure on 90% or more), **proficient** (secure on 60% or more and "not yet" on 25% or fewer), **developing** (secure on 30% or more, or "not yet" on half or fewer), **not yet**. Against the grid's current cell, which averages every listed skill:

| Unit | Today's cell: secure · developing · not yet | By key skills: mastered · proficient · developing · not yet |
|---|---|---|
| Unit 1 · Using Objects and Methods | 7 · 22 · 7 | 0 · 8 · 23 · 5 |
| Unit 2 · Selection and Iteration | 12 · 23 · 1 | 5 · 9 · 20 · 2 |
| Unit 4 · Data Collections (in progress, 8 of 32 key skills checked) | 9 · 19 · 8 | 0 · 10 · 25 · 1 |

Eighteen students are proficient in no unit yet, eight in one, six in two, four in all three started units. The hard skills can gate the standing (proficient only when no hard key skill is "not yet"): then nobody is proficient in Unit 1 or 2 today, because Class Instantiation in Java is "not yet" for 27 of 36. So the gate belongs on **mastered**, not on **proficient**, or the page empties.

### The goal in units, and pace by standing

**Goal: "Proficient through Unit N by a date."** The default is the unit the class is in and the end of the year; the units on offer are the book's, started ones marked.

**Pace by standing, not by rate.** The class's own schedule is the plan: it has finished Units 1 and 2 and is in Unit 4. A student is **on pace** when proficient in every finished unit, **behind in one unit** or **behind in two** otherwise, **ahead** when mastered in all of them. Nothing is projected; the gap is a number a teacher can act on ("six key skills to close in Unit 2") and it is the reteach list.

| | Students |
|---|---|
| On pace (proficient in Units 1 and 2) | 6 · Dylan, Marvin, Noah, Ray, Ronnie, Shaun |
| Behind in one finished unit | 10 |
| Behind in two | 20 |

Against the page today: of the 11 it calls "On pace", one is on pace by standing; of the 7 "Ahead", four; and Dylan, "Short, not catching up" by rate, is proficient in both finished units and is simply drifting now, which is the Drifting page's finding, not this page's. The two readings disagree because they answer different questions: the count asks how fast a student is collecting skills, the standing asks whether they have the units the class has done.

**Why not project to the date.** The goal through Unit 4 holds 68 key skills, of which the class has met 34; the other 34 are in lessons not yet taught. A projection from each student's rate over the 12 class weeks, continued for the 15 class weeks left, reaches the 68 for nobody, because it guesses at units the class has not reached. The date belongs to the class's plan ("at the class's pace so far, Unit 3 and the rest of Unit 4 come by about week 28"), and a student is measured against what the class has finished.

### The page, sketched

```
ON PACE · Is each student on pace to be proficient through Unit 4 by the end of the year?
6 on pace · 10 behind in one finished unit · 20 behind in two.
Goal: proficient through [Unit 4 ▾] by [5 Jun ▾]       Key: ▆ mastered  ▆ proficient  ▆ developing  ▆ not yet   n = key skills to close

              Unit 1 (done)      Unit 2 (done)      Unit 4 (now)       Unit 3 (later)
Andrew        ▆ not yet · 11     ▆ not yet · 9      ▆ not yet · 5      ·            Behind in two units   [Reteach list]
Ashlee        ▆ developing · 7   ▆ developing · 6   ▆ developing · 3   ·            Behind in two units
…
Marvin        ▆ proficient · 2   ▆ mastered         ▆ proficient · 1   ·            On pace
Class         0 · 8 · 23 · 5     5 · 9 · 20 · 2     0 · 10 · 25 · 1
```

One row a student, one cell a unit of the goal, the standing's colour and the number of key skills to close; sorted by units behind; the class row at the foot. It reuses the Overview's "By unit" cells, so the two pages say the same thing, and the grid's cells can adopt the same standing (a decision below). The Overview's answer becomes "30 students are behind in a finished unit", its Pace word becomes "On pace / Behind in 1 / Behind in 2", and the profile's "Skills secure 19 of 100" becomes "Proficient in 1 of 3 units · 6 key skills to close in Unit 2".

### Decisions in this section

1. **Which skills are key.** A and B by default, as above, with the list editable by the teacher; or the book's tests alone (A: 21, 33, 50 a unit, broader); or add the hardest by results.
2. **The thresholds.** Proficient at 60% secure and 25% not yet, mastered at 90%. At 50% secure the proficient count rises (Curtis, Yolanda and Trevor become proficient in all three started units).
3. **The hard-skill gate.** On mastered only (proposed), or on proficient too, which empties the page today.
4. **Pace by standing** (proposed) or a projection to the date; a projection can be added for the units the class has reached, never through the ones it has not.
5. **One standing everywhere.** Whether Effort and mastery's cells and the Overview's unit cells adopt the key-skill standing, so a unit is "proficient" on every page for the same reason.

### Limits of these numbers

- The key skills of a unit the class has not reached come from the book's lesson lists; the ones it has been checked on grow as the unit is taught (Unit 4: 8 of 32 so far), so a standing in the current unit is provisional and should say so.
- Which lessons count as a unit's tests was read from their names (summary, test, exam, exercises, practice, FRQ); the book has no field for it.
- The thresholds are mine, chosen so that today's class is spread across the four words; they are the first thing to try on a second class.

## 5. The first-look set

What I would keep on the first screens, so that a teacher new to the pages can go through them in about two minutes, and what the rest becomes.

| Page | First screen | Folded one click away | Time |
|---|---|---|---|
| Overview | The answer with names; the students with a step to take, one line each: name, why (one phrase), one picture (the three unit cells, keyed), the button | The other students; sparklines; sorting | 25 s |
| Effort and mastery | The answer; the picked unit's scatter and its three cards | The grid (started units only); the line; the sort | 15 s |
| Drifting | As it is, with the break weeks hatched | "One low week" rows; the other 29 | 15 s |
| On pace | The goal in units; one row a student with a cell a unit and the number of key skills to close (section 4) | The unit and date pickers; the key-skill lists | 12 s |
| Skills (Shared weak + Hardest + Fading as one page) | The answer; the weak-skill rows grouped by status, each row with "was N% when taught" where it faded; the panel with Plan a reteach | The outline by unit; the fading dumbbells; the scatter | 20 s |
| Stall points | The answer; the worst five to eight questions as a list; the panel | The outline; "Not started" | 15 s |
| Ready for a unit | "Which unit next?"; the tree; the three cards | The slider; past units | 15 s |
| My actions (What worked) | The log | The effect chart, when a real set can be judged; sample rows, fenced | 8 s |
| A profile | As it is, without sample moments | – | 12 s |
| | | | **≈ 137 s** |

Two sketches.

```
OVERVIEW · How is each student doing?
4 drifting · 8 stuck despite effort in Data Collections        Key:  ▆ secure  ▆ developing  ▆ not yet
                                                                     ▬ practice done  ▬ under the line  ● stuck
Needs a step first · 24
Student    Why                                   Units 1 · 2 · 4    Next step
Ashlee     Stuck in Data Collections              ▆ ▆ ▆●            [Small-group reteach]
Dylan      Drifting since week 11                 ▆ ▆ ▆             [Check in]
Laurie     Stuck in Unit 1 and Data Collections   ▆●▆ ▆●            [Small-group reteach]
…
▸ 12 students with nothing to do first · 6 ahead
```

```
EFFORT AND MASTERY · Who is doing the work, and is it turning into mastery?
Data Collections: 6 stuck despite effort, 5 not doing the work.
[Unit 1] [Unit 2] [Unit 4 ●]  +10 not started

 Mastery ▲                            │  Stuck despite effort · 6
   Coasting      │  On track           │  Ashlee Caroline Laurie Roger Sarah Yvette
                 │  Keep going         │  [Reteach in a small group]
 ────────────────┼───────────────────  │
   Not doing     │  Stuck despite      │  Not doing the work · 5
   the work      │  effort             │  Antonio Joan Lawrence Mariah Travis   [Talk to them]
                 └──────────► practice │  Coasting · 2 · Christian Paula        [Offer a stretch task]
▸ Every student by unit
```

## 6. Decisions that are yours

1. **One skills page or three.** Shared weak skills, Hardest content and Fading skills answer three questions with one list of skills. One page with "by status", "by unit" and "faded" views reads once; three pages read three times. The separate answers are worth keeping only if each page's first sentence says something the others do not (section 2 has the sentence Fading could say).
2. **The rail's numbers.** Remove them and let the order carry the priority, or keep them and accept that first-timers read them as counts.
3. **What "now" is.** The latest week with class work is 12; the footer says 16. Either every figure names its week ("week 12's work") or the four quiet weeks are shown as quiet (hatched) wherever a line runs through them.
4. **Not-started units.** Hide them on the grid, the outlines and the overview by default, with a "+N not started" chip; keep them only on Ready for a unit, where the future is the point.
5. **The goal on On pace.** Section 4 has the five choices: which skills count as a unit's key skills, the thresholds for proficient and mastered, whether the hard skills gate them, pace by standing or by projection, and whether the grid and the overview adopt the same standing.
6. **Invented rows.** Keep the sample rows only inside a clearly fenced box on What worked, never in a headline, a profile or a following mark; or drop them until a real targeted set has later work.
7. **The Overview's shape.** A table of all 36 students (as now) or a list of the 24 with a step first. The second is faster; the first is what a gradebook-minded teacher expects.
8. **Phones.** Out of scope for the scan, or a stacked layout for the Overview and the two pages that scroll sideways.
9. **The demo chrome.** The example link and the "Mock" chip are for us; decide whether a teacher-facing demo shows them.

## 7. What this review did not do

- It judged the pages on one real class with one book. The example with three more books adds a Book row to every page (31 more words on the Overview) and was not re-reviewed here beyond that.
- It did not test with a teacher. "Reads as" is my reading of each component at first sight, backed by the counts, not an observation of someone else's.
- It did not time the scan with a stopwatch; the times are words divided by a scanning pace of four a second, which is generous for pictures that need a key.
- It did not review the tooltips' wording one by one (there are more than sixty on the Overview alone) or the "How to read" texts for accuracy, only for length.

## 8. Afterword: what was built

On 13 October 2026, after this review was read, the proposals of sections 2, 4 and 5 were built on branch `version2`. Where section 6 left a decision open, the option this review marked as proposed was taken; they are listed below so that each can be reversed. The checker (`node tools/check.js --checks`) passes: seven of its checks were rewritten because the rules they held were reversed on purpose, and fourteen were added for the new rules.

### Before and after

Both versions were measured the same way: the words in the text of the page's view (chart labels included) that sit in the first 900 px at 1440 × 900, the controls there, "How to read" as written, and the page's height. The table in section 1 counted the whole window, so its "before" numbers are larger than the ones here; the two columns of this table are comparable with each other.

| Page | Words on the first screen | How to read | Controls visible | Page height |
|---|---|---|---|---|
| Overview | 197 → 189 | 148 → 51 | 92 → 29 | 2,147 → 1,663 px |
| Effort and mastery | 148 → 151 | 225 → 53 | 15 → 22 | 2,083 → 990 px |
| Drifting | 153 → 139 | 53 → 50 | 21 → 21 | 1,085 → 900 px |
| On pace | 239 → 275 | 96 → 52 | 39 → 25 | 942 → 1,481 px |
| Skills, weak now (was Shared weak skills) | 198 → 212 | 102 → 53 | 48 → 51 | 970 → 1,206 px |
| Skills, by unit (was Hardest content) | 149 → 116 | 73 → 47 | 45 → 48 | 900 → 925 px |
| Skills, faded (was Fading skills) | 91 → 101 | 92 → 50 | 14 → 16 | 900 → 900 px |
| Stall points | 142 → 149 | 74 → 48 | 42 → 45 | 959 → 955 px |
| Ready for a unit | 132 → 140 | 84 → 49 | 16 → 16 | 1,067 → 1,055 px |
| My actions (was What worked) | 190 → 109 | 74 → 47 | 11 → 3 | 987 → 900 px |
| A profile | 110 → 134 | – | 7 → 8 | 900 → 900 px |
| **All eleven screens** | **1,749 → 1,715** | **1,021 → 500** | **350 → 284** | |
| **The eight pages a teacher opens, and a profile** (one view of Skills) | **1,749 → 1,498** | | | |

What the numbers say, and what they do not:

- **The words on the first screens barely moved.** Most of them are names: the Overview's 24 rows, the pace table's 36, the 27 students in the Skills panel. A page whose answer is who is behind cannot get under 80 words, so that budget in section 1 was wrong for pages whose answer is a list of people; count the names apart. What changed is what the words are: a name, one phrase and a button, instead of chart labels, numbered chips and status words.
- **"How to read" is half the length** (fifty words or so a page, sixty on the grid), and no page's picture depends on it any more: every mark is keyed on the page.
- **Ten pages became eight**, and the three that named the same skill are one page with three views.
- **The two tallest pages halved.** The Overview opens on the 24 students with a step to take first, not all 36; Effort and mastery opens on one unit's chart, with the grid folded under it.
- **On pace grew**, in words and in height: it shows all 36 students, one row each, with a number a cell, and has no projection, no second chart and no slider.
- **The controls are mostly names** (every name is a button that follows the student). Without them, the Overview went from 92 to 29 and My actions from 11 to 3.

### What was built, page by page

- **Overview.** The answer names who: "4 drifting (Christian, Dylan, Joan and Mariah). 4 stuck despite effort, most in Using Objects and Methods: small-group reteach. 30 behind in a finished unit." Then the key, and one line a student who needs attention first: name, why (the worst thing a page found, in the order of the steps: drifting, stuck or not doing the work, behind, then the content pages), the three unit cells (headed "Unit 1 · Unit 2 · Unit 4"), the button where one fits. Twelve students are folded ("Show the other 12 students · 8 behind in one unit"). The sparklines, the "Skills secure" column, the pace column and the 83 numbered chips are gone.
- **Effort and mastery.** A row of buttons for the started units ("+10 not started" beside them), the key, then the unit's scatter (the share of its key skills secure, up; the share of its questions tried, across) with the three cards and their buttons beside it. The grid is a fold under that ("Every student, by unit"), started units only, with the line and the sort inside the fold; the per-student summary bars and the trend row are gone. The grid's cells, the overview's cells and a profile's chips now show the same standing.
- **Drifting.** The weeks with no class work are hatched and the line stops at the last week that had some; the dashed week-8 line is gone; "Doing less each week" became "Week 15: 0% of class work, normal 63–100%"; the three "one low week" students are one line of names. A profile's timeline is drawn the same way.
- **On pace.** "Goal: proficient through [Unit 4 · Data Collections (now)] by [4 May (week 36)]", two selects, with a sentence on when the class's own pace reaches it. One row a student, a cell a unit of the goal in the standing's green with the number of key skills still to close, sorted by units behind; the class divided at the foot. The answer: "6 on pace · 10 behind in one finished unit · 20 behind in two." A finished unit is one before the unit the class is in, in the main book; a unit of labs is never one; too early to tell is not behind.
- **Skills.** One page, three views. *Weak now*: the answer names the skill to reteach first ("Class Instantiation in Java first: 27 of 36 not yet secure"), the rows run under a heading a status (getting worse, still weak, improving, recovered) with no status word on each row, a skill that faded says what it fell from ("faded: 71% → 10%"), empty statuses have no tab, and the panel opens with a card a teacher can check at a glance, "Introduced in · Unit 1 · Using Objects and Methods · 1.20 Unit Summary 1b (1.7-1.15) · First met on 9 Sep · 30 questions check it", which opens the grid at that subunit with the skill picked (added later the same day on request; the by-unit and faded views have the same card). *By unit* is the old Hardest content without the ▲ marks and with the not-started units as one count. *Faded* is the old Fading skills with "Needed in Unit 4" as the last column, no left bars and no sort. `#hardest` and `#fading` still open their view.
- **Stall points.** Opens on the eight questions where the most students gave up or skipped, ranked, each with its lesson code; the outline is the second view, with "+10 not started" as one line.
- **Ready for a unit.** Asks "Which unit do you teach next, and is the class ready for it?", picks the first unit not started after the one the class is in (Unit 5 here) and says so, marks the started units "done" and "now", and folds the readiness line under the plan.
- **My actions.** Opens on the log of everything done today, then "Did the practice sets work?" for the real set, with the headline counting real sets only ("Too early to tell for the one set you targeted"). The six sample rows sit in a fold of their own, marked invented, with no names in their panel; they reach no headline, no profile moment, no flag and no "did this" mark.
- **A profile.** "Proficient or better: 2 of 3 units", "Class work, week 15", "Pace: Behind in 1 unit · 6 key skills to close in Unit 1"; the unit chips carry the standing words; the moments have no sample rows.
- **Across the pages.** The rail has no numbers (its order is the priority); the "Mock · real class data" chip is gone and the example link lives in the footer; the following bar's flags name their page on hover; the footer says "the latest class work is from week 15"; the example with three more books still works on every page.

### The decisions taken

From section 4 and section 6, in their order; each is mine until you say otherwise.

1. **One skills page**, with the by-unit and faded views one click away.
2. **The rail's numbers removed**; the order carries the priority.
3. **"Now"**: every weekly figure names its week, the quiet weeks are hatched wherever a line runs through them, and the footer says which week the latest class work is from.
4. **Not-started units** are counted, not shown, except on Ready for a unit.
5. **The goal and the standing**: key skills are A and B (assessed by the unit's own tests and carried forward), proficient at 60% secure and 25% not yet, mastered at 90% with the hard-skill gate on mastered only, pace by standing with nothing projected, and one standing on every page.
6. **Invented rows** stay, fenced off, and never touch a headline, a profile or a following mark.
7. **The Overview** is the list of students with a step first. "Behind in one unit" is a step but not a first one, so those students are in the fold with their button.
8. **Phones** are out of scope; the pages still fit 390 px, with the tables and the charts scrolling sideways.
9. **Demo chrome**: the "Mock" chip is gone, an "Example" chip shows only while the example is on, and the way to the example is in the footer.

### The actions, narrowed

After the build, the actions were limited to the four things the product can do: a reteach, coursework (a set built from the item bank, by skill or by item type), content to practice, and a group. Nothing is sent, launched, marked or changed in the course, and a page offers a button only where one of the four fits.

| Where | Was | Now |
|---|---|---|
| Overview, a drifting student | Log a check-in | No button; the row says why, and the student stays in the first list because the flag is red |
| Overview and Effort, not doing the work | Talk to them | Assign the practice (the unit's own work, as content to practice; the labs, under a book of labs) |
| Overview, Effort and Ready, coasting or ahead | Stretch task | Stretch set (coursework) |
| Drifting | Check in · Message home (with a draft) · Not a concern | No buttons; the page says who, since when, and the signals |
| Skills, weak now | Plan a reteach | Reteach |
| Skills, faded | Schedule a review | Give a review set (coursework, as a warm-up) |
| Stall points, gave up | Add a worked example first | Reteach this |
| Stall points, skipped | Make it a required check | Assign it as coursework |
| My actions, sample rows | Lunch coding club · Messages home about unfinished sets | Extra practice sets on loops · Pair work on unfinished sets (both invented, as before) |

Unchanged: Small-group reteach and Reteach in a small group (a group and a reteach), Generate practice and Assign (coursework by skill), the readiness plan's Reteach to everyone and Small groups. A check now holds this.

### Dates, not weeks (later the same day)

Two more decisions came after the actions: weeks are not relevant, and students may keep working on earlier parts at any time. Four answers set the design: today is the export date; nothing assumes a class day or a timetable; catching up shows on the profile only; "recent" is the latest continuous five days.

What changed:

- **Today is the export date** (13 October 2026 for this export, whose work runs to 5 February 2026), and the footer says so, with the day of the latest work. An "As of" date picker under the answer on every page (`index.html?today=YYYY-MM-DD`) re-reads them as of another day, with a way back to today; it is a way to look back, not an assumption, and it is how a page that says "no class work in the last five days" is read for the days the class was working. For the demo, the Drifting page opened without a day moves to the latest day it can judge, so it never opens empty; the address shows that day.
- **Every figure is a date.** "Drifting since 14 Nov", "First met on 24 Sep", a unit "worked on 10 Nov to 8 Dec", a skill checked again "21 days or more later", the pace goal "proficient through Unit 4 by [a date picker]", and the class-plan sentence in dates ("3 units between 3 Sep and 5 Feb 2026; the 5 units of this goal take until about 21 May 2026").
- **Time runs in five-day blocks counted back from today**, so the latest block is always the last five days. A block in which nobody in the class worked is a break, read from the data, hatched on the charts, and left out of every rule. The charts run from the first day of work to a little after the latest, so an idle tail does not squeeze them.
- **Effort is any work.** A student's work in a block is the questions they first tried in it, on any unit, so catching up on Unit 2 in December is working. Their normal is the middle of their earlier live blocks (the latest two left out); low is under half of it.
- **Drifting is judged against the class.** A student is drifting when they are low in the last five days and in the live block before, and only while classmates are not low too. When nobody in the class worked in the last five days, or half the class or more is low, the page says so ("The class as a whole is working less: 29 of 36 are under half their normal in the five days to 19 Dec") and singles out nobody.
- **The profile says "Catching up: 45 questions on Unit 2, the latest on 15 Dec"** or "Working ahead: …"; the Overview does not mention it.
- **A picker with many options is one select, never a row of buttons** (asked for later the same day, on seeing 35 unit buttons under three book rows on Ready for a unit in the example). The unit on Effort and mastery, the next unit on Ready for a unit, the unit filters on Skills, the goal unit on On pace and the Book filter are selects; with several books the units are grouped by book inside the select. The view switches and the status tabs stay as buttons: they have two to four short options.
- **A time axis carries dates only.** The unit bands over the Skills chart and the profile's timeline are gone: a student may redo an earlier unit's work at any time, so a unit cannot be placed on a date axis. The Skills page filters by unit instead ("Through Unit 2" shows the skills introduced up to that unit, with their whole history).

What it shows on this class, read as of three days:

| As of | Drifting page says |
|---|---|
| 13 Oct 2026 (the export date) | No class work from 9 Oct 2026 to 13 Oct 2026; the latest was on 5 Feb 2026. Nobody judged. |
| 19 Dec 2025 | The class as a whole is working less: 29 of 36 under half their normal (283 questions tried against 355 in a usual five days). Nobody singled out. |
| 14 Nov 2025 | 2 students are drifting below their own normal: Darren and Mariah. |

Opened without a day in the address, the Drifting page moves to the latest day it can judge (19 Nov 2025 on this class, 22 Nov in the three-book example), so a demo never lands on the empty state; "Back to today" returns to the export date.

So on this class the page names students only while the class is in full swing (October to mid-November); from late November the finding is that the class as a whole is winding down, which the data supports (37 class days of 50 or more active students, the last on 8 December, and a December tail carried by a dozen students). The standings, pace, skills and stall points do not depend on time and are unchanged. Pictures: `reports/img/after-drifting-2025-11-14.png` and `after-profile-2025-11-14.png`.

### The Overview, removed

Later the same day, on request, the Overview page was removed. The rail opens on Effort and mastery, and an old link to `#overview` lands there. What the Overview carried lives on elsewhere: a student's flags in the bar for a followed student (each opening its page), the one next step and the practice set on the profile, and the names with a button on each page's cards. The before-and-after table above keeps the Overview's row as a record of what was measured; `reports/img/after-overview.png` was removed with the page.

### What is still open

- The key-skill rule, the thresholds and the gate are the mock's; they are the first thing to try on a second class.
- Which flag is a student's "why" when several fire, and whether "behind in one unit" belongs above the fold.
- The word budget for a first screen: names are most of the words now, and a different budget is needed for pages whose answer is a list of people.
- Phones.

### Pictures

`reports/img/after-*.png`: the first screens after the change, one a page, at 1440 × 900 (whole page).

## Files

| | |
|---|---|
| `reports/first-time-teacher-review.md` | This review. |
| `reports/img/review-*.png` | The first screens of every page, the whole Effort page, Stall points with a student followed, and the Overview at phone width, as captured. |
| `reports/img/after-*.png` | The same first screens after the changes of section 8, as captured. |
| `reports/img/after-drifting-2025-11-14.png`, `after-profile-2025-11-14.png` | Drifting and a profile read as of 14 November 2025 (`?today=2025-11-14`), when the class was in full swing. |
