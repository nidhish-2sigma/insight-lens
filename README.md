# Insight Lens — interactive mock

Two mocks live here. Both are plain HTML, CSS and JavaScript with no build, no
server and no dependencies, and both run from `file://`.

| Open | What it is |
|---|---|
| `index.html` | **The current mock.** The Course Atlas for one real class, read from the database: seven pages and student profiles, in the theme and the words of the ALPS app (`alps-react-app`): its colours, its type and its names for a level. |
| `lens.html` | The earlier mock, on invented sections: a Brief and six tabs. Everything from "The earlier mock" down describes it. |

## The current mock (`index.html`)

**ALPS integration:** the current UI uses shared ALPS icons and semantic theme
tokens, with scoped styles and an embedded mount/unmount API. See
[the integration guide](reports/alps-integration.md) for the React adapter,
color meanings, source synchronization and verification commands.

### Current display · 27 October 2026

All page insights are visible in the same responsive card format: title, value
and explanation. No insights sit behind “More insights”; card titles and text
wrap in full. Skills includes every insight from its three sections, and On
pace includes every applicable status.

Each page leads with the visual that answers its question. Exact figures and
question-level evidence remain available on demand. Scoring, coverage caps,
thresholds, forecast rules and missing-evidence distinctions are unchanged.

* **Engagement:** the default scatter plots actual score (0–100) against
  eligible practice tried (0–100%), with shaded regions, ALPS score bands and
  names beside students needing attention. Open markers identify coverage-limited
  levels; coincident marks show counts and expose their students on selection.
  Student evidence uses cards for score, mastery level, checked skills and practice;
  developing skills open their underlying questions. Filters, lab-only practice
  distributions and exact figures remain available. The secondary curriculum
  grid has been removed.
* **Drifting:** date-aligned histories show the latest eight five-day blocks
  on the same 0–200% scale, with 100% meaning each student's own usual. The
  sustained drop is red; class-wide inactivity creates a gap and pauses
  individual alerts. Overflow is marked. Selection opens the full history,
  exact counts, signals, profile and explicit Follow control.
* **On pace:** aligned tracks show mastered now, a dashed conditional estimate
  and the common goal, on a labelled 0–N skill-count axis. Evidence dates,
  observed rates and every goal skill remain inspectable. The even-pace
  reference is optional. Navigation preserves the date and textbook.
* **Skills:** support bars split the full class into beginning/attempted,
  other assessed, one check and not attempted. Selection retains all five
  mastery levels, histories and date/skill comparisons. By unit uses five-level
  distributions of assessed student–skill results; selecting a unit opens a
  keyboard-navigable student × skill heatmap. Faded uses paired initial/later
  dots on a common 0–100 scale for both class and student comparisons.
* **Stall points:** equal-width question bars show every outcome. Attempts
  without a working check stay neutral. Review by unit and lesson aligns
  unique-student counts in separate Not yet correct and Skipped columns;
  opening a row reveals its lessons or questions. A student can appear in both
  columns. Full pooled outcomes and counting definitions remain available.
* **Readiness:** Tree and Radial diagrams retain the earlier prerequisite
  rings, level distributions and taught markers. Switch layouts in the chart
  header; use **Show all prerequisite skills** to expand the four-skill preview
  to every direct prerequisite, including those without enough evidence.
  Both layouts start fitted to the viewport, with zoom in, zoom out and Fit
  controls. Zoom preserves the centre and survives evidence selection. Select
  a ring for evidence. One expandable table retains all prerequisite relationships
  and exact figures; plans consider every direct prerequisite.
  Target levels, 60%/80% group thresholds and unknown evidence stay separate.
* **My actions:** estimates and 90% ranges align around a common zero line.
  Unestimated sets remain in Awaiting evidence. Comparisons describe
  association. The chronological action log follows the comparison.
* **Profiles:** linked timelines show mastered counts against taught-skill
  counts, and activity against own usual. Selecting a period updates both
  readings, including assessment coverage and exact question counts. Unit
  strips open the skill heatmap; lab units open practice participation.
  Four stable summary fields and the full unit audit remain available.

Charts retain the same units and scales across their rows. Selections are
persistent, use native keyboard controls, and preserve chart scroll positions
when evidence redraws. Question results retain retry credit, relevance weights,
initial/later evidence and their separate unknown states.

The earlier display notes below record previous iterations. For current
verification, run `node tools/check.js --checks`; it includes the existing
numerical/historical checks and the focused comparison, Engagement, Skills,
profile, readiness/actions and Stall points behavior suites. Frozen numerical
results protect Drifting, On pace, weighted evidence and intervention estimates.

```
open index.html
```

The screens and their logic came from `Class 7B Course Atlas.html` (kept here
as the source they were taken from). The look and the names are the ALPS
app's (`alps-react-app`): its colours, Noto Sans, and its words for a level
(Beginning, Attempted, Familiar, Proficient, Mastered), for what a page
measures (performance, engagement) and for the book (textbook). The
numbers are no longer invented: they are worked out from one class in the
`anonymized-prod` database.

**The class on screen**: section 218, "APCS 25-26", 36 students on CS Awesome
2.0 (13 units, 230 subunits), with work from 1 September 2025 to 5 February
2026; the export's recorded date supplies the initial "As of" date on the pages.
The class has started three units (1, 2 and 4) and met 100 skills. Student
names are the anonymised ones the database holds.

**A class with more than one textbook.** A section can list several books
(`section_curriculum`), and the export writes every one of them. The real
class has one, so its pages say nothing about textbooks. To see the pages with
several, open `index.html?books`: the same class with three more books, whose
outlines are real and whose work is invented (`data/example.js`). While it is
on, a chip in the top bar says so, and pressing it goes back to the class as
recorded. With work in two or more books, every page and a
profile start their controls with one filter, **Textbook**: all the textbooks, or one
of them (`?book=java-short-labs` in the address). `reports/more-than-one-book.md`
has what the database shows about such classes and the rules the pages follow.

**What a teacher sees first.** On 13 October 2026 every component of every
page was reviewed as a teacher seeing it for the first time
(`reports/first-time-teacher-review.md`), with the budget of two to three
minutes for all the pages together. The pages were then cut to what fits that
look: one question, one answer in a sentence, one picture with its key on the
page, the names, and the button; everything else one click away. The report's
afterword has the before and after, and which of its open decisions were
taken.

Run `node tools/check-pace.js` for the target scope, date-dependent estimates,
controls, narrow and wide chart markup, and multiple-book behavior. These
checks also run as part of `node tools/check.js --checks`.

### Where the data comes from

```
pip install pg8000
PGPASSWORD=… python3 tools/export-atlas.py [section_id]     # default 218
```

`tools/export-atlas.py` reads one section through the Cloud SQL proxy
(`127.0.0.1:5434`, database `anonymized-prod`, user `postgres`; override with
`PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`) and writes `data/class.js`
(`ATLAS_OUT=path` writes it elsewhere). The password comes from the
environment and is written nowhere. The session is read-only. It writes every
book the section lists, the primary ones first, gives each a short name for
the places with little room, and marks each unit and each assignment with its
book (`tb`). A class with one book is written exactly as it was before the
export knew about books. Two items or two lessons that share a position come
in the order of their ids, so two runs give the same file. A question checks
a skill only when its tag's relevance score (`item_skill.relevance_score`:
25%, 50%, 75% or 100%) is above 50% (`MIN_RELEVANCE`, shared with the
prerequisite tool). Every tag on this class's questions scores 75% or 100%,
so the cut changes nothing in `data/class.js`.

```
PGPASSWORD=… python3 tools/make-example.py
```

`tools/make-example.py` builds `data/example.js`, the example with three more
books. It reads `data/class.js` and the outlines of Java Short Labs, Be
Prepared and Java Methods from the database (real), and invents the class's
work in the first two, following what the few real sections with several
books show and each student's own real record. It says so at the top of the
file, and the same seed gives the same file. Run it again after every new
export.

```
PGPASSWORD=… GRAPH_BUCKET=… python3 tools/export-prereqs.py
PGPASSWORD=… SKILL_GRAPH_FILE=graph.json python3 tools/export-prereqs.py
```

`tools/export-prereqs.py` builds `data/prereqs.js`: the skills each unit
builds on, two levels back, for Ready for a unit. The database holds no
edges. Its `knowledge_graph` table (and the older `skill_graph`) names the
graph file of the book's skill set, and the learner model keeps that file in
its cloud bucket. The tool finds the newest one and reads it from
`SKILL_GRAPH_FILE`, or from the bucket named by `GRAPH_BUCKET` (under
`GRAPH_PREFIX`, default `learner-model`) with the token of `gcloud auth
application-default login`. The bucket and the password come from the
environment and are written nowhere. In that file an LLM judged each pair of
skills, and the weight on an edge is its confidence.

The tool re-reads the outline through `tools/export-atlas.py`'s read-only
session and stops unless `data/class.js` is that very export. A unit's
skills are the ones its graded questions are tagged with at more than 50%
relevance. The lessons' teaching weights carry no relevance score, so they do
not count; a unit with no such question, Stories here, has no tree. Level 1
is what the unit's skills need that the unit does not use itself, kept only
when three or more of the unit's questions need it (a question one of whose
skills it leads to; `MIN_NEED`) and ranked by how many do, then by the edge's
confidence times use. Level 2 is what each of those needs. The skill set spans
other books, so at both levels the skills that three or more of this class's
questions check come first: a skill nothing here checks cannot say who is
ready. How much evidence the class has on a skill never decides whether it is
in the tree, only whether its ring has a share. The file
also names, for every skill in a tree, the class's lessons with a teaching
weight for it, so the page can say whether it was taught. And it sums up
ALPS's own levels for the class (`alps`): the learner model's latest score
for each student and skill (`student_performance_predictions`, the newest
`data_cutoff`, as the product's service reads it), rounded to 0 to 100 as the
service rounds it and banded at ALPS's cuts (40, 55, 65, 80); the file keeps
the model, its data cutoff, the share of those levels at each of the five,
and the share of skills on which a student's score sits within 5 points of
their own median. The page draws none of them ("ALPS's own levels", below), and its
sources say why with these figures. The tool stops unless `data/class.js`
lists the students the section has now. Run it again after every new export.
Without the file the page falls back to the coverage weights.

The anonymised copy of the database is refreshed from time to time, and a
refresh gives every student a new anonymised name, so an export from before
it no longer matches the database: `tools/export-prereqs.py` stops and says
so. Run the three tools again, in the order above.

`data/class.js` holds facts only: the students, every unit, subunit and
question in textbook order, the skills each subunit teaches and each question
checks, each student's result on each question (right first time, tries, when),
daily activity, assigned
sets and who finished them, bug reports, and the practice sets the teacher
targeted. It is a script, not JSON, so the page can load it from `file://`.

`js/atlas.js` works out every figure from those facts, so another class needs
only another export. Nothing is assumed about the plan: the database holds no
course plan, no term dates and no timetable, so today is the export date (an
"As of" date picker under the answer on every page re-reads them as of
another day, `index.html?today=YYYY-MM-DD`), a unit's days are the days the class worked on it, nothing
is counted in weeks, no class day is assumed, and no unit is treated as next.
Students may work on any part at any time: all of it counts as work, and a
profile says when a student is on an earlier unit or working ahead. The class's work ran from September to mid-December 2025 (one
answer on 5 February 2026 is the last), so on the export date nothing is
moving. Drifting and On pace keep the selected date. “View latest active
period” explicitly opens the latest day Drifting can judge (the class working,
fewer than half of it low), 19 November 2025 here. The address shows that
historical date; the date control can return to the export date.

### How the figures are defined

| Term | Meaning |
|---|---|
| Credit | For one question: a quick question (multiple choice, fill in the blank, click, drag) counts 1 when right first time and ½ on the second try; a code or Parsons task counts 1 when right within three tries, ½ within six and ¼ after that, so a task got right at last still beats one never right (a quick question right after its second try still counts 0: by then it is often found by elimination). |
| Performance on a skill | The student's score: their credit on questions tagged with the skill, each question weighted by how relevant it is to the skill (`item_skill`'s relevance score, 1 or 0.75 above the cut, kept by the export in each item's `rel`). Answers in the first 21 days and answers 21 days or more later are averaged apart; once there are two or more later answers, the later average weighs 60%. Until then a later answer counts like any other, in one average with the rest: one question doesn't decide a level, a fade or a slip, and no answer is dropped. The band is of the whole percent shown, as ALPS bands it (55% is Familiar). The level is ALPS's band of the score (`perf_thresholds`): Beginning under 40%, Attempted from 40%, Familiar from 55%, Proficient from 65%, Mastered from 80%. It takes two checks to count; with one the level is unavailable, with none not attempted. Where a page acts on a group, the levels fold into three: mastered; familiar or proficient; beginning or attempted. Every page, Ready for a unit too, reads this one level. |
| ALPS's own levels | Read, not drawn. ALPS's learner model scores this class too (`student_performance_predictions`: glmnet, data cutoff 6 February 2026), but it gives each student nearly one score on every skill: on 95% of skills a student's score is within 5 points of their own median, every unit averages about 49 (2–4% proficient or above, even units the class never opened), and across the class 79% of its levels are Attempted and 0.1% Mastered. Its levels would tell no skill or unit from another, so the pages work the level out from the answers instead, and the sources name the model with these figures. |
| A unit's key skills | The skills its own summary, test, exercise and practice lessons check that are also carried forward: named by two or more lessons and checked by three or more questions, or needed by a later unit. In the product this list would be the teacher's to edit; here it is worked out from the book. |
| A student's level in a unit | ALPS's unit band, read on the key skills the class has been checked on so far: the level of the student's mean score on the ones they have a level on, capped by the share of them that is (ALPS's coverage caps: under 25% at most Attempted, under 50% at most Familiar, under 80% at most Proficient). With none, unavailable. The scatter plots the actual mean score; evidence coverage and a coverage-limited level are shown separately in the table and evidence panel. The grid's cells and a profile's chips read the same function. A subunit's level is read the same way on its own skills. Pace counts mastered skills in the selected goal instead. |
| Pace | The teacher picks a target unit and a calendar date. The goal is mastered on all of that unit's key skills plus the earlier skills its lessons use, counted once. Unrelated earlier skills and later units are excluded. Each student's net increase on this set in the 30-day period ending at their latest recorded check sets their rate. The projection adds gains from the selected "As of" date to the deadline, capped at the goal, assuming learning continues or resumes at that observed pace. The unrecorded gap before "As of" is not extrapolated; a flat or declining observed rate adds no gains. Fewer than two checked skills (one for a one-skill goal), or checks on only one day with skills still to learn, means too early to estimate. The dotted line spreads the goal evenly from the class's first encounter with a required skill to the deadline; it is a reference, not a recorded timetable. |
| A subunit's skills | Up to three skills the subunit gives most teaching weight to (`unit_skill_coverage`), preferring ones three or more of its questions check (`item_skill`). A review or test subunit lists what it checks most. |
| Started | A quarter of the class has tried one of the subunit's questions. A unit is started when one of its subunits is. |
| The class's questions | Questions a quarter of the class tried. Engagement is the share of them a student tried. (ALPS's own engagement score is a percentile of time and attempts; this is the plain share, and the page says so on its axis.) |
| Work in five days | The questions a student first tried in a five-day block, on any unit: a student catching up on an earlier unit, or working ahead, is working. Blocks count back from today, so the latest block is always the last five days. A block in which nobody in the class worked is a break, read from the data, and is left out. A student's normal is the middle of their earlier blocks, the latest two left out. |
| Drifting | Under half their own normal in the last five days and in the live block before, judged only while classmates are not low too: when the class as a whole has stopped (no work by anyone in the last five days) or slowed (half the class or more under half their normal), the page says so and singles out nobody. |
| No working check | Eight or more students tried the question and nobody's answer was ever marked right. It is listed as broken and left out of every level. |
| Shared weak skill | A taught skill on which a fifth of the class or more is beginning or attempted at the same time: a score under 55% on two or more checks. Its line is the share of the students with a level on it (eight or more) who have mastered it, five days at a time, drawn upward on a fixed 0 to 100% scale, under the heading "% of students who have mastered it"; each row is a small chart with its own scale (100%, 50% and 0% on faint lines), divided from the next. Getting worse when that share fell 10 points or more over the last 30 days of class work, improving when it rose 10 or more, recovered when under 8% of the class is beginning or attempted, still weak otherwise. |
| The class's books | The section's list: one or more primary ("main") and any number supplemental. A unit, a lesson and a question belong to one book. A skill is shared: the books of one subject tag their questions from one skill set. The main book sets where the class is. A book with no work yet is counted in the top bar and shown on no page. |
| The textbook filter | With work in two or more books, the first control on every page and on a profile: "All textbooks", or one textbook with work. "All textbooks" puts the books together: a page that offers units groups them by book, each with a letter the filter keys. One book narrows the page to its units, lessons and questions, the skills its lessons use, and the work done in it. A student's level on a skill does not change with the filter: the evidence stays every question on the skill, in every book. |
| A lab | A question in a book of labs, where nine in ten questions are coding tasks. A lab is work done, never a check on a skill: it counts in engagement and in five days' work, and is left out of every level. A unit of labs is drawn as one gray bar, the share of its labs tried. On a page about a book of labs, "gave up" reads "not right yet", in gray. |

### What is real, what is approximate, what is missing

| Page | Status |
|---|---|
| Profiles, Engagement and performance, Skills (by unit and faded), Stall points | Real, by the definitions above. |
| Drifting | Real. Attendance is not recorded, so the signals are class days with no work, assigned sets unfinished and the change in accuracy. |
| On pace | Real skill evidence, with a conditional projection if learning continues at each student's latest observed pace. It keeps the selected As of date. On the export date the class had not worked for months, so estimates explicitly assume work resumes. “View latest active period” offers the historical active date. Evidence dates and observed rates remain open in the selected student’s evidence panel. The target's earlier skills are inferred from textbook coverage, rather than a skill dependency graph. The default deadline is 30 days after the selected "As of" date; the teacher can choose any date on or after the "As of" date. All relevant lessons count even before the class starts them; the earlier-skill list is not truncated to the readiness tree's top four. |
| Skills (weak now) | Real. It began as "Misconceptions", but the item bank does not tag wrong answers with the misconception behind them. The view now shows the skills many students are weak in at once, five days at a time, and who they are. |
| Stall points | Questions only. Skipped means never tried though the student got past it (worked in that lesson or a later one); before that, not reached yet. An open is recorded for only about one in eight of the readings and videos students worked past, so they are left out. |
| Ready for a unit | Real edges, judged by a model. What a unit builds on, two levels back, comes from the learner model's skill graph (`data/prereqs.js`), in which an LLM judged each pair of skills. A unit's skills are the ones its graded questions are tagged with at more than 50% relevance. The skill set spans other books, so some prerequisites are checked by no question in this class: those are drawn dashed, counted under the tree, and never colour the answer. A ring needs eight students with a level on the skill (two checks or more), and its share is of those students: the ones at the level the teacher picks on the readiness line, or above; its hover counts the others in ALPS's words, not attempted and unavailable. Under each skill, a book says it was taught (a lesson that a quarter of the class worked on has a teaching weight for it). Its hover says how many questions check it and when it was last asked. The top row is the four prerequisites the most of the unit's questions need (three or more), whatever the class's evidence on them. The page opens on Class Creation, the unit the class skipped: three of its four rings rest on 33 to 36 students; the fourth, Assign Values to Variables, needed by 10 of its 125 questions, is dashed, since no student has two answers on it. Without the file, and for the example's books, coverage weights stand in. |
| My actions | Real. The log is what you did in this session. Under it, every set the database records for the class: the one targeted practice set (the array review of 8 December, with too little later work to judge) and the 20 sets assigned to the whole class with a due date (Units 2 and 4, October and November 2025), each judged by the same rule on later work on its skills, the students who did it (an assigned set's finishers) against those who didn't. Two can be judged, 2.20 Loops Coding Practice (+10 points, range −6 to +27) and 2.21 Loops Multiple Choice Exercises (+6, −5 to +17), both promising, not proven; for the other 18 nearly everyone finished, so nobody is left to compare with, or there is too little later work. They are listed with why. The invented sample rows that once filled this chart are gone. |
| Drafted questions in practice sets | Removed. Sets are built only from questions in the item bank. |
| The textbook filter | Real arithmetic on whatever the export holds. The days a student worked are not split by book, so under a picked book the five-day blocks are the whole class's. |
| The example with three more books (`?books`) | The class and its work in CS Awesome 2.0: real. The outlines of Java Short Labs, Be Prepared and Java Methods: real, from the database. The work in the first two: **invented** (`data/example.js`), and the page says so while it is on. |

The pages no longer carry this table, or any footer (asked 26 October: "remove
these parts from all the pages"). The log of everything you did, which the top
bar opens, is the My actions page.

Two pages were removed. "Attention now" replayed the last busy lesson minute
by minute; it went with its replay rows in the export and the flags and
profile moments that came from it. "Item health" mapped every question by how
many got it right and how well it separated students; it went with the rows
of first answers in the export. Which questions are broken or misleading is
still worked out, because a practice set leaves those out.

### What is on screen

Every page is built for a teacher's first look: one question, one answer in a
sentence, one picture with its key on the page, the names, and the button that
does the thing. What the first look does not need is one click away, in a
fold that remembers whether it is open. The budget behind this, and the
measurements, are in `reports/first-time-teacher-review.md`.

Every button is one of the three things a teacher can do in the product:
coursework (a practice set built from the item bank), content to practice
(the unit's own work, assigned), or a group. The product has no reteach, so
no page offers one: the students beginning or attempted on a skill, or
struggling in a unit, get "Form a group" while they are a small group, and no
button once they are half of the students checked or more. Nothing is sent,
launched, marked or changed in the course, and a page offers a button only
where one of the three fits: a drifting student gets none, because none of
the three answers that.

* **Top bar**: the ALPS frame, the class, and My actions (everything you log
  on any page). Nothing is saved or sent. While the example with more books is
  on (`?books`), a chip says what in it is invented and takes you back.
* **Pages down the left**, in three groups, in order of how much each helps
  a teacher (no numbers: a first-time reader took them for counts). Students
  opens with Engagement and performance. There is no overview page: a student's flags
  are in the bar for a followed student, each opening its page, and their
  one next step and practice set are on their profile.
* **No header above the view, and no footer.** The top bar names the class;
  each page's As of picker shows the day it is read as of (today, the export
  date, unless picked).
* **Following a student**: click a name on any page and that student is
  picked out on every page. A bar at the top lists what flags them, each
  flag naming its page on hover; "Stop following" or Esc ends it.
* **One page at a time**: the question, the answer in one line, then the
  picture, the names, and what to do. "How to read" opens beside each
  question, in fifty words or so.
* **A chart shares its row.** On a wide window a chart is not stretched across
  the page: it sits on the left, with the panel that explains it on the right.
  That is the scatter beside the three groups to act on (Engagement and performance),
  the worst questions or the outline beside the picked question (Stall
  points), the weak-skill rows, the fading rows and the effect ranges beside
  the picked row (Skills, My actions), the readiness tree beside its plan
  (Ready for a unit), and a student's timeline beside their moments. On a
  narrower window the two stack and the chart takes the full width.
* **Little text.** The screens carry labels, numbers and names. Explanations
  sit in "How to read" and in tooltips; evidence is a bar, a chip or a small
  figure, not a sentence; the action is the label on its button.
* **What the class has not started is counted, not shown**: "+10 not started"
  beside the unit picker on Engagement and performance, under the outlines, and on a
  profile, with the names on hover. Only Ready for a unit lists every unit,
  because there the future is the point.
* **Engagement and performance opens on one unit's chart**: everyone placed
  by eligible practice tried (across, 0–100%) and actual mean score on checked
  key skills (up, 0–100), with shaded regions and ALPS score bands. Select a
  student for cards showing score, resulting mastery level, checked skills with
  mastered/developing counts, and questions tried against the practice threshold.
  Developing skills appear as cards with their level and score; each opens the
  student/question evidence. Unknown checks and coverage caps remain explicit.
  The Exact figures view retains every student on the same fields. The unit
  picker and filters choose the cohort; Class actions apply to the selected
  unit. The secondary student-by-unit grid has been removed.
* **Drifting is in dates, five days at a time.** The line is the questions a
  student tried per five days, on any unit, against their own normal; the
  stretches in which nobody in the class worked are hatched and the line does
  not run through them. The figure names its dates ("9 Oct to 13 Oct: 0
  questions, normal 23"). Over the lines a heading says what their height
  is, "Questions tried in each 5 days"; each student's line has its own
  scale on its left (0, half and a round top, on faint lines) and the last
  five days in bold at its end, and
  a stretch of it gives its dates and count on hover. The small lines of the
  other students have no numbers. When the class as a whole is idle or slowing, the
  page says that and names nobody. Students under half their normal in the
  last five days only are one line of names. A profile's timeline has two
  rows on one time axis, each with its own scale: skills mastered (0 to 100%
  of the skills met), then questions tried against the student's normal, drawn
  as on Drifting; a card says when a student is on an earlier unit or working
  ahead (not "catching up", which On pace uses for a student speeding up).
* **On pace keeps `main`'s tracks**: a solid bar for each student's required
  skills mastered now, a dashed continuation to the selected date, the goal
  line and the dotted share due today. Status groups and the sort by status,
  projection or name remain; a wide page uses two charts on the same scale.
  The teacher picks a **Target unit** and a **By** date in a calendar field.
  "Skills in this goal" opens the exact list, split into target key skills
  and earlier skills used here. Profiles and followed-student flags use the
  same selected goal. An older export uses each student's latest recorded
  learning period and labels the forecast as assuming work resumes at that
  pace. Hover for the period's dates. A flat observed pace stays flat;
  missing history is shown as "Too early to tell".

* **A page's filters sit on the right of its title** (asked 26 October:
  "move all the filters to the right of each page and just after the title.
  The cards must come after it"): the page's own filters, then the textbook
  and the day, then "How to read", all in the title's row, and the answer
  cards under it. Each Skills section has its own row (its question, its
  filters); the day sits alone at the top right of that page. Stall points'
  Show and Sort sit beside the By unit chart's name; a profile's day sits
  beside the student's name. A view hands its filters to the frame as it
  draws (`toHead`), so they live in one place.
* **Each chart is in a card of its own, and a section is one card** (asked 26
  October: "keep each graph in it's own card. Some sections have multiple
  graphs. Use one card for each the full section. Also, use material UI"):
  the page is grey and its question, filters and answer cards sit on it; each
  chart, with its name, key and the panel beside it, is a white card with
  Material's first elevation. A section with several charts is one card: each
  Skills view, each Stall points view, the Engagement grid. My actions has the
  log and the sets as two. A card opens on its chart's name (Ready for a unit:
  the name, then "Level needed", then the key). No card holds another. A check
  draws every page, every Stall points version and the radial Ready and holds
  each chart, its name and the box it is drawn into to a card.
* **One way to show each thing, on every page** (asked 26 October: "The looks
  don't look consistent. Be consistent with how and where to show things"):
  - *The page*: the title row first (the question; the page's filters, the
    textbook and the day on its right; "How to read"), then one row of up to
    four answer cards, on the page, then the cards. Skills now has a title
    row and one answer row like the rest (teach first, weak skills, hardest
    unit, faded most), and its "How to read" has a short paragraph a chart.
    A student's profile has the same cards, in place of its tiles and its
    line about catching up.
  - *A card*: its header is its chart's name, with that chart's own filters on
    the right of the name (Weak now's units, status and "Show all"; By unit's
    Show and Sort; Faded's unit and "Show all"; the grid's line and sort;
    Stall points' outline's Show and Sort). A card that folds has a chevron in
    the same button as the name; the old section names (Weak now, Worst
    questions…) and the questions over each section are gone. Then the key,
    then the chart, then its panel.
  - *A key*: one plain row under the header, on the left, squares for
    categories, led by what they count ("Students"); never boxed, never pushed
    to the right; levels always run mastered first, as the bars and rings are
    drawn. Each chart keys only its own marks: Engagement's scatter keys its
    levels' band, the grid's key moved into the grid's card.
  - *A panel*: on the chart's right, with a hairline between. Its groups all
    look alike, a swatch, the name and the count, the names, the group's
    button; no box round a group or a fact (Engagement's groups, Ready's plan
    groups and "Introduced in" lost theirs). Stall points' two views each hold
    the panel for the question picked in them, as Skills' views do, in place of
    one panel beside both.
  - *More*: "Show all N" is a tick beside the card's name (Weak now and
    Drifting now, as Faded had it); a list under a chart is a fold at its foot;
    every fold puts its chevron before its words.
  - *Rows of students* are divided by lines (Drifting's rows lost their boxes).
  A check draws every page (with the example's books too, every Stall points
  version, the radial Ready, the grid open, a card folded) and holds each to
  this: the title row first, one answer row before any card, every card
  opening on its named header, every key inside a card, no old control.
* **Every card read in two or three seconds** (the same request: "reason all
  the (big/small) cards and see what it is supposed to show and whether some
  can infer it in 2-3s"). A fresh reader, given only the screenshots, read
  each card for three seconds; what slowed them or misled them was fixed:
  - *Numbers that disagreed on a page*: Engagement's "Low engagement 1" was
    the class's current unit beside a chart of another unit showing 5 (the
    cards now answer for the unit on show, and add up to the class: "On track
    18 of 36 … 3 more nearly there", struggling, low engagement, coasting, each
    with what sets it apart); Skills' "26 skills" beside a chart of 29 ("of the
    29 on the chart; 3 getting better"); Faded's −62 beside 71 → 10 (the change
    is now of the rounded figures); My actions' 24 and 9 beside 26 and 10 ("24
    of the 26 who finished it, 9 of the 10 who didn't"); the profile's one
    axis for a percent and a count (two rows now, each with its scale).
  - *One word for one idea*: "Too early to tell" (not also "Can't be judged
    yet"); "On an earlier unit" for a profile's side work, since On pace's
    "catching up" means speeding up; "When first met" on Faded, since Ready's
    "Not taught yet" means the lesson isn't done; "goal" and "your date" on On
    pace; "Nearly there" for the scatter's grey dots (they were "Keep going",
    which read as a student's name); struggling and low engagement red in the
    bar for a followed student, as on Engagement.
  - *What a mark or column is*: the scatter's dots keyed; Faded's axis,
    "points" and "students slipped 20+" named; My actions' dot and range keyed
    and its axis spelled out ("extra points on later questions, against those
    who didn't do it"); "30 due by 19 Nov" and "Back to 26 Oct 2026" in place
    of a "today" that meant two days; a date carries its year when it isn't the
    page's own year ("due 29 Oct 2025" read as three days away on 26 Oct 2026);
    "+10 units not started"; "14 of its 30 questions".
  - *Nothing drawn that the key leaves out, nothing keyed that isn't drawn*:
    "No class work" is keyed only where a stretch is hatched; Drifting's red
    starts at the first low stretch, not at the point before it; Faded's
    "Needed in" column shows only when a row needs it.
  - *A panel shows a row you can see*: a list whose rows open into deeper rows
    (By unit, Stall points' outline, Faded) opens with nothing picked, in the
    middle of its card, and a row clicked opens its panel; a list of the top
    few (Weak now, the worst questions, the sets) opens on its first row.
  - *A plan says what it does*: Ready lists who it leaves out ("The other 21
    are ready") and what accepting logs ("Logs a stretch set for 15").
* **A level weighs each question by its relevance, and later work needs two answers** (asked 26 October: "There is a relevance score in the db for every item skill pair. Let's use that as well and weight the items that have more relevance higher than the one with low relevance", after Kenneth read Beginning while Ebony, who answered fewer, read Attempted). The export now keeps each tag's relevance (`rel` on each item, `tagRel` for the prerequisites); a third of the tags on the questions the class answered are 0.75, the rest 1. Kenneth had 13 answers in the first 21 days (58%) and one later answer, wrong, on 10 Nov; the later answer counted 60%, so Kenneth read 23%, Beginning. Now that one answer counts like the others: 55%, Familiar (58% since the quarter credit below). Ebony stays 50%, Attempted. A first version of this change dropped a lone later answer instead, which left some levels resting on one question (0% or 50% exactly, as on Draw Shapes with Java Graphics); a lone later answer now joins the one average (Eileen 0% → 21%, Abigail 50% → 29%). The table's hover says what each answer earned (full, half or no credit), since "correct after retries" earns none after 6 tries on a code task. 262 of 2,388 levels change from the original rule (131 up, 131 down; relevance alone moves 117, the later-answer rule 160). Class Instantiation in Java, which most of the class met again only in that one hard question, leaves the weak skills and Faded: Skills now opens on 2D Graphics Operations (24 of 36 beginning or attempted), and Loop Output faded most (84% → 60%, 6 of 26 rechecked skills). Engagement's Unit 1 reads 19 of 36 on track, 5 nearly there, 2 struggling. The data is the same export as before plus the relevance; two test bug reports filed that morning were left out.
* **The skill's table shows what the tries earned, as a shade** (asked 26 October: "Can we also have a way to show how many retries so users can quickly understand why two students are showing different mastery levels", then, of a first version with a number beside each mark: "no need to show the numbers. maybe be the shade dark light based on that?"). ALPS's "correct after retries" mark is darker the more credit its tries earned: solid green with a white arrow for full credit (a code task right within 3 tries), ALPS's own pale mark for half (within 6, or a quick question on the second try), almost white with a faint green arrow for a quarter (a code task right after 6 tries), gray for none (a quick question right after its second try). The key shows the four shades in ALPS's words; a screen reader hears the credit; the hover gives the try, the credit and the day. How much a question counts toward the skill (fully, or three quarters when its tag's relevance is 0.75) is in its head's hover; a ¾ by its number was tried and dropped (asked whether to keep it: "Drop"). Sorting on a question puts the most tries first among the same mark. Asked next why Gary and Melvin read the same though only Gary got the last question right (on try 11, so it earned nothing, like Melvin's wrong answer), they chose a quarter for a code task right after six tries, quick questions left at nothing: Gary now reads 65%, Proficient, and Melvin 60%, Familiar, on Iterate Over Array Elements on 10 Dec. 185 levels go up and none down; the weak skills on the chart go from 27 to 18 (Iterate Over Array Elements leaves them); Engagement opens on Data Collections, the unit with the most struggling now.
* **The answer cards, less cluttered** (asked 26 October, of Stall points' two cards: "make the small cards better. they are not looking too good. Organize and reformat things to make it less cluttered"). Every page's cards are one size, four to a row (two on a narrow screen, one on a phone), where they were up to 270 px wide each and left the row half empty. What a card is reads as a small overline (MOST GAVE UP). A count stays the big figure in its status colour. A name is set smaller (16 px, at most two lines), its bulb or format hung beside it so a second line lines up with the first, a lesson as a muted tag after it ("Modulo Operation Patterns 2.19"), and the count leading the line under it takes the status colour ("**29 of 36** gave up", "**84% → 60%** class average, first met to now"). The line under is at most two lines.
* **No footer and no "Where the numbers come from" on any page** (asked 26 October: "remove these parts from all the pages"). The line on the data (anonymised, read as of, the latest work, nothing saved, the books) and the table of sources are gone, and with them the link to the example. The example still opens with `?books`, and its chip in the top bar now takes you back. A check holds that no page has either.
* **A table of two days bands what each student had started by the earlier one** (asked 26 October, of Modulo Operation from 21 Sep 2025 to now: "for this part, I don't know till which unit/content the student solved for the previous date. Can we add a marker for teacher to quickly identify?"). With two days picked on one skill's line, each row has a pale gray band behind the questions the student had started by the earlier day: the answers that day's level was read from. The band runs as far as they had got, and shows a gap where they skipped ahead: Dean, Krista and Lee had started most of lesson 2.19 by 21 Sep, before 2.2 to 2.9. Abigail's band is questions 1 to 3, all right first time, so Mastered, 100%, on 21 Sep; the questions after it bring Abigail to Familiar, 60%, now. The key says "Started by 21 Sep 2025"; a banded mark's hover adds "In the level on 21 Sep 2025", and a screen reader hears "started by 21 Sep 2025". The table's hover, the followed student's row and a picked question's column now set only the background colour, so the band shows through them. A check holds the band, in every two-day table on every weak skill, to exactly the answers started by the earlier day, and keeps it off one-day tables; three deliberate breaks were caught. `reports/img/two-day-band.png`.
* **Faded, laid out again** (asked 26 October: "this is looking weird. Let's reorganize different components of this card to make the look clean and good"). With a skill picked, the students' chart now sits under the skills' chart in the left column, the same width and on the same columns (names, the score scale, the change), so it reads as the one chart a level down. Beside both, a short panel keeps in view: the skill and its 84% → 60%, where the class met it, then "Give a review set" and "Students and questions" together at its foot. The panel used to hold the students' chart, which left a tall column beside five short rows. On a narrower page the panel comes between the two charts.
* **A ring's number on Stall points (v7) is who gave up or skipped** (asked 26 October: "why is the number inside the rings sometimes using gave up and other times skipped?"). It was the larger of the two, so the list, ordered by both together, read 29, 20, 15, 27…; they chose both together. The rings now read 32, 30, 28, 27, 26, 26, 25, 25 down the worst questions, as the course map's tiles do. The number is red for a stall point and amber for an often skipped one; the ring's red and amber parts still show the split, and the key says "in the ring: gave up or skipped".
* **Faded's panel draws the picked skill's students the way the left chart draws skills** (asked 26 October: "Instead of having two graphs for this one, can we just have two instances of the left graph. The right instance should show students on the y-axis and based on selected skills show the changes"). The scatter is gone. Under "Each student: when first met and now", each student with a later check has a row: the score when first met (open circle), the later check (solid dot) and the change in points, biggest drop first by the change shown. Red is a slip of 20 points or more, green a gain of 20 or more, gray between. It opens on the students who slipped, the panel's answer (18 on Loop Output), with a "Show all 36" tick beside the chart's name. A row's hover gives both scores, and a click follows the student. A check holds the rows, their order, each change and the tick on every faded skill; two deliberate breaks were caught.
* **Stall points' rings (v7) say less** (asked 26 October: "This is looking too verbose"). Beside a lesson's or unit's ring there is now only its worst question, with its format, under one "Worst question" heading; a question's ring stands alone. The line used to repeat the ring's counts ("19 gave up on something · 17 skipped something · 20 got all they reached · worst: …") and ran to two lines; the counts are in the ring's parts and the row's hover. The key's note is now "each student once, at their worst".
* **Code, Parsons and DOK, checked; the rule kept** (asked 26 October why two students read the same when one retried a code task and the other a Parsons problem, and to use the database's DOK "if needed"). Both second tries were within the three tries a code or Parsons task gets for full credit. DOK (`item_skill.dok`, 1 to 4 for each question and skill) is 2 on both questions, and across the textbook it does not rate code above Parsons; in this class Parsons problems take as many tries as code. Weighting by DOK would move 147 levels without telling these two apart, so they kept the rule. The figures are in the report ("Code, Parsons and DOK, checked").
* **Every skill's name has a bulb, and every question's its format** (asked 26 October: "add icon for skills and item type to quickly know where we are showing skills/items"). A skill ("Modulo Operation") and a question ("Modulo Operation Patterns") could read alike. Now a bulb comes before every skill's name, and the question's format (code, multiple choice, fill in the blank, Parsons, click or drag, the marks the table's question heads already had) before every question's: in lists, panel headings, answer cards, the skill's table and a practice set's rows. Units and lessons have none, and a name in a sentence or a hover has none. On a chart whose names are set against it (Weak skills, Faded) the bulb sits between the name and the chart; on Ready's trees it sits before the name, on the ring's side; on Engagement's skill columns, before the slanted name; on Stall points' grid, column and map versions, at each question's column or tile. Each mark is one stroked path, one source for the table, the text and the charts. Stall points' name column is 40% wide (it was 38%) so a name with its mark keeps to one line, and On pace's goal skills drop their bullets, the bulb being the mark. A check holds a mark by every name the pages draw (the weak and faded charts' rows, the cards, a unit's skills, a skill's panel and table, every question on Stall points, every skill on both of Ready's trees); four deliberate breaks were caught. `reports/img/name-icons-skills.png`, `reports/img/name-icons-stall.png`.
* **The bar for a followed student comes in six versions to choose from**
  (asked 26 October, of the bar for Drew: "Let's use different formatting for
  this following card. It is mixing up everything. Give 4-5 different versions
  of it to select from"). Each flag now carries its status apart from its
  details (`flags()` gives `s`, `d` and `dl`; `t` is the old one line). A
  Version select in the bar, or `?fv=1` to `5`, picks one: *Current* (one pill
  a flag, everything run together), *v1 · Status chips* (the statuses alone,
  details on hover), *v2 · A row a page* (page, status, details in columns),
  *v3 · Columns* (a strip of figures with lines between), *v4 · By group* (under
  the rail's groups), *v5 · Scorecard* (a slot for every page, the same for
  every student). Side by side, for Drew and Lee (taken again after the scoring
  changes): `reports/img/following-versions.png`. A check renders every version
  for every student and holds each status apart from its details. Asked to
  choose one: "keep all for now as they are", so all six stay, and the Version
  select with them.
* **Nothing on a page repeats what is already on it** (a review asked for on
  26 October, the graph versions left as they were): a line that restates a
  chart's name, its axis, a card or "How to read" goes, and so does a tile
  that the bar for a followed student already shows as a flag. One caveat
  stays because it changes what a number means: On pace says "Projections
  assume work resumes at each student's latest pace" when the latest work is
  old.
* **Every page's answer is a row of cards** (asked 26 October: "for insights
  like these, use cards and show them in a clean format"): each card says what
  it is, gives the answer (a name or a count) and one line on what it means, a
  count in its status colour and a name's card with a coloured edge. Weak now
  reads "Teach first · Class Instantiation in Java · 26 of 36 beginning or
  attempted", "Weak skills · 26", "Improving · 2". The sentence the cards come
  from stays on the page for screen readers, and a page redrawn after its
  chart (Engagement, On pace, Ready for a unit) re-tells both.
* **Every chart has a name over it,** three to seven words saying what it
  shows in a teacher's words (asked 26 October), kept in one list (`CT`, and
  `SVT` for each Stall points version) so a check holds every name to seven
  words: "Each student's engagement and performance", "Each student's work
  against their normal", "Skills mastered now and by your date", "Weak skills:
  share mastered over time", "Students' levels by unit and skill", "Class
  average when first met and now", "Skills Class Creation builds on", "Abigail:
  skills mastered and questions tried". The name sits over the chart's key.
* **Skills is one page with three views, all on it** (asked 26 October: "In every
  page, make collapsible views and show all views in a scrollable way"): *Weak
  now*, *By unit* and *Faded* run one under another, each a card that folds
  under its chart's name, with its own filters beside the name; the page's
  question, answer cards and "How to read" sit over all three, as on every
  page. A folded card stays folded, and a link into a view (or its old
  address, `#hardest`, `#fading`) opens its card and scrolls to it. *Weak now* lists the skills a fifth
  of the class or more is weak in, under a heading a status (getting worse,
  still weak, improving, recovered), worst first, each row a line for the
  share of the students with a level on the skill who have mastered it (lower
  is worse, so a hard skill sits low or falls; each row carries its own
  scale, 100%, 50% and 0% on faint lines), with a filter for the
  skills introduced through a unit (a time axis carries dates only, never
  units, because a student may redo an earlier unit's work at any time), with "faded: class average 71% → 10%"
  under a skill that was once higher (the average, named, since the row's own line is the share mastered); the panel opens with a card naming the
  unit and subunit where the skill was introduced, the day the class met it
  and the questions on it (click it to open the grid there), then the class
  now drawn as a picked day is (one bar of every student by level, the counts
  in it, unavailable hatched, with its key), and the way into the
  skill's table (below). *By unit*'s panel draws the class now the same way. "Where they stall →" opens Stall points on the
  questions that check the skill, worst first (it shows only when such a
  question is there to see). Click a day on a line to see who was where that day;
  a second day on the same skill compares the two, by where each student is
  on the later day and where they were before (lost it: a review set;
  beginning or attempted, never got it or fell back: form a group; familiar
  or proficient: a practice set; got it; held), and a day on another skill compares the two
  skills on the later day (beginning or attempted on both: form a group). Buttons appear on today's
  lists only; a past day offers "Compare with now". The class on a day is one
  bar as ALPS draws a class (its five levels, mastered first, then
  unavailable, hatched) with its key, and the bar is the count: one day has no
  cards, only today's actions under it (form a group, a practice set), each
  naming its group on hover. Two days are two bars on one scale and likewise
  have no cards: the change between them is the groups of the point's table,
  and today's actions are buttons under the bars. Two skills, which have no
  bar, keep a card an overlap, whose name opens the table on it. "Students
  and questions" opens the table on the group the panel is about. No card or
  line repeats a count a bar shows. A point's table is the skill's
  table read as of its day, the later of two: a level column for each day, or
  for each skill with both skills' questions, the panel's groups, and the
  panel's actions. A question counts from the day it was first tried, with
  the result it ended with, as the levels count it. The left and right arrows
  pick a day on a focused row, and Esc clears it. *By unit* is the outline of the textbook with a bar a row, the class by
  mastery level (what was Hardest content); its panel offers the same "Where
  they stall" as *Weak now* for the same skill. A followed student
  has a column there as on Stall points, in the class key's own squares and
  colours: on a skill, the square of their level; on a subunit or unit how
  many of its skills they have not mastered, by group, each group's square
  split between its two levels' colours (beginning or attempted, familiar or
  proficient), a skill once however many lessons list it. *Faded* is the before-and-after of every skill that was
  checked again (what was Fading skills); nothing is picked to begin with,
  and a click on a skill opens the chart of every student beside the rows.
  Its axis starts at 40, or lower when a class average falls under it, so no
  dot is pinned to the edge.
  The old links still open their view.
* **A skill's students and questions are one table.** Each view's panel
  keeps the answer (the class bar, the action) and opens "Students and
  questions", a dialog shaped like ALPS's results table and in its words: a
  row a student, their level as ALPS's battery with the score behind it (a
  red arrow when the score slipped 20 points or more since the skill was
  taught), their last activity on it, then ALPS's result a question:
  correct on first attempt, correct after retries, rapid retries (all
  retries within 3 seconds; here, when the time on the retries came to three
  seconds or less), not yet correct, not started. ALPS's other two results,
  started and result unknown, need what the export does not carry. The
  questions are the class's (a quarter of the class started them), grouped
  under their lessons in the order the class met them; a tick adds the ones
  only a few started. The first row counts who is not yet correct on each
  question. It opens on the students the view is about (beginning or
  attempted on a skill still weak; on *Faded*, those who slipped), with every group a click away,
  the weakest first; a column's heading sorts by it, and a question's heading
  picks it: its name, lesson and results over the table, those not yet
  correct first, and the way to Stall points. A name follows the student, as
  everywhere. Esc or the cross closes it.
* **Stall points shows both its views**: first the worst questions, the
  eight where the most students gave up or skipped, as one ranked list with
  the lesson code, then the outline of the textbook by unit, each a card that
  folds under its chart's name. The worst questions open on the first of them
  with its panel; the outline opens with nothing picked, in the middle of its
  card, and a question picked there opens its own panel beside it (a second
  click closes it), as By unit and Faded do; the panel stays in view beside a
  long list. Show and Sort sit beside the outline's name. Each bar splits the class on a
  question (pooled over a lesson's or unit's questions): gave up (tried, never
  right), skipped, needed retries, first time, and not reached yet. A student
  who never tried a question has skipped it once they have worked in its
  lesson or in one the class worked on after it (they got past it); before
  that they have not reached it yet, drawn as an empty part with a line round
  it, as ALPS draws not started, and named apart in the panel. So a lesson at
  the end of where the class got to no longer reads as skipped: Java Wrapper
  Class Errors (4.7) is 6 skipped and 21 not reached yet, not 27 skipped. A
  followed student has a
  column of their own, marked in the class key's squares and colours (red
  gave up, amber skipped, pale green needed retries, green first time, empty
  not reached yet), so one
  key ("Students and Abigail") reads the bars and the student; on a unit or
  subunit the column counts the questions they gave up on and skipped. A skill's "Where they stall"
  on the Skills page narrows both views to the questions that check that
  skill: every one of them ranked the same way (the most retries breaking a
  tie, so a skill nobody gives up on still shows where it takes retries), the
  worst picked, the skill named in the answer and in a bar with "All
  questions" beside it. The rail and a student's flag open the page on every
  question.
* **Stall points has ten other versions to compare,** switched in one select
  at the top of the page ("Version", in two groups) and opened from the address with
  `?sv=1` to `?sv=10`; the page opens on the current bars, and each version
  has its own "How to read". The first five (asked 26 October: a question is
  one result a student, a lesson or unit many, and stacked bars read neither
  well) redraw the marks: v1 diverging bars, v2 a column an outcome, v3 dots
  on one scale, v4 a grid of students by lessons, v5 a square a student. The
  plainer five (asked the same day, for teachers who don't read charts, and
  then "the visualization should be based on some graphs") are simple graphs
  on counts of students, with nothing pooled: red and amber are strong only on
  a stall point (7 or more of the 36 gave up) or an often skipped question (11
  or more skipped), pale below. v6 a bar chart, two bars a row on a track that
  is the whole class (gave up, skipped), a lesson or unit showing the most on
  any one of its questions, named; v7 rings as on Ready for a unit, each the
  class (gave up, skipped, got it, not reached yet), a lesson or unit counting
  each student once by the worst of theirs there, so a lesson reads as its
  questions do, and no number on a ring with nothing to flag; v8 one
  column chart of every started lesson in course order, the most who gave up
  and the most who skipped on one question, a lesson opening to its questions;
  v9 a funnel a question (got to it, tried it, got it right, with the part lost
  to skipping and to giving up), a lesson or unit showing its worst question's;
  v10 a map of the course, a row a unit and a tile a lesson, counting the
  students who gave up on or skipped something there (strong past the page's
  lines, pale below, green with no number when nobody did), a tile opening to
  its questions.
* **Ready for a unit asks which unit is next** and picks the earliest one
  not started that comes after a unit the class has started: a unit the class
  skipped comes first (Class Creation here, whose tree rests on the most work),
  and with none skipped it is the first after the unit the class is in; one select holds every unit, with
  "done" and "now" on the started ones. Under it is the **readiness line**
  ("Level needed"): ALPS's levels from attempted up as four stops on one track,
  each with its battery and what the class is at it for this unit (ready,
  groups first, not ready). The stops are gray nodes on a gray track, with no
  status colour: that is left to the shares in the rings. The picked stop's
  node is filled and ringed in the primary colour. Under it, the key is two
  lines: the ring's levels as squares, mastered first, then the share inside
  and its three ranges in the colours the shares take, the dashed ring and the
  books, its groups apart with a hairline. The teacher picks the level the unit needs, proficient
  to begin with, and the tree, the plan and the answer read it. Under the line
  is a tree two levels deep: the top row is what the unit's skills need, the
  row under it what those need, each a ring splitting the students with a
  level on the skill by mastery level (mastered first, a white gap between
  levels), with
  the share at the picked level or above inside it in its status colour (red
  under 60%, amber under 80%, green ready), so the numbers say what the class
  is good at and what it is not, with a
  book under it, filled when the class was taught it and hollow when not;
  its hover says how many questions check it and when it was last asked. The
  top row is the four prerequisites the unit needs most, by how many of its
  questions need each (three or more; the hover says "4 of the unit's 99
  questions need it"), whatever the class's evidence on them: one with too
  little is a dashed ring, so a skill the unit hardly needs is never pulled up
  because the class has answered it a lot (If-Else Statements in Java, needed
  by 1 of Inheritance's 99 questions, was). Under each, up to two of its own
  prerequisites with evidence. A ring's levels are the class's answers whether
  or not a started lesson lists the skill; the book says whether one taught it.
  They run weakest
  first, left to right, so the first ring is where to start. The page keeps
  its text to what a decision needs: the unit box carries its name alone, the
  rows are not named (the links show them), the key is drawn with the tree's
  own marks (the five levels, the three share colours, the two books), and
  the plan's cards name skills without their shares, which the
  rings show. A small group holds only the students with a level on its
  skill below the picked one; the ones with no level on it are counted apart
  ("+5 with no level"), names on hover. Going further stays for the students who
  have mastered every skill shown, whatever the level. A card with nothing in
  it is left out and one line says so ("Nothing to reteach."); a name's remove
  button shows when the pointer is on its row. The second row draws only
  skills with evidence; the others are counted under the tree ("+8 more
  prerequisites", names on hover).
* **A plan group can be put on the tree.** The small group's card and the
  ready-to-go-further card each have a "Show on tree" button: the tree
  then shows that group alone (each ring the share of its students at the
  level), says so above it ("Small group · 4 students"), and "Whole class"
  goes back. The plan, the stops and the answer stay the class's. A new
  unit starts on the whole class; on a phone the page scrolls up to the tree.
* **Ready for a unit has a radial version of its tree to compare,**
  switched in one select beside the unit picker ("Version") and opened
  from the address with `?rv=2`. It keeps the current tree's rings, links,
  books, key and plan cards and changes one thing: the unit in the middle,
  the skills it builds on around it and what those build on further out. It
  has its own "How to read". The page opens on the current version.
* **The tree is drawn plainly in every version.** A ring is ALPS's level arcs
  over the students with a level on the skill, and its hover counts each level
  and, in ALPS's words, the students not attempted and unavailable; the share inside has a small % sign; the unit is a box in the primary
  tint; the links are thin right-angled elbows from one rail (a fan from the
  centre in v2), and on the radial tree a label sits clear of its ring.
* **Students are listed to be scanned, never as chips.** Every list of
  students on every page is one list: a row a student, in alphabetical
  order, with a hairline under each, in columns that run down then across
  once it is long. Where the page has the number behind a student's place,
  it sits at the right of the row and a short caption names it: on
  Engagement and performance, questions tried, or for a struggling student
  the key skills mastered in a unit, the skills mastered in a lesson or the
  score on a skill, questions
  tried against their normal on Drifting, the score on Skills, the score when
  taught and later on the faded skills, and how many of a group's skills on Ready for a unit.
  A name still opens the student; a group on Ready keeps its button to take
  a student out.
* **A picker with many options is one select, never a row of buttons**: the
  unit on Engagement and performance, the next unit on Ready for a unit, the
  unit filters on the Skills page, the goal unit on On pace, and the Textbook
  filter. With several textbooks the units are grouped by textbook inside the
  select.
* **My actions opens on the log** of everything you did today, then every
  set the class was given, judged on later work on its skills: the targeted
  ones and the ones that can be judged on the chart, the rest in a fold
  ("Can't be judged yet · 18"), each with why. For a set assigned to the whole
  class, the detail lists who didn't finish it. Nothing on it is invented.
* **More than one textbook.** With one textbook nothing on any page says
  "textbook". With more, the top bar counts them ("CS Awesome 2.0 + 3
  textbooks"). Every page and
  a profile then start their controls with the Textbook filter, one select,
  which keys each textbook to a letter: A, B, C. Under "All textbooks" the grid has a label
  over each book's columns, the outlines (Skills by unit, Stall points) group
  by book, and every unit select groups its units by book. A unit or lesson of another book says its book
  wherever the page is not about that book. The main book's units are the
  bands of time, the units a level is read in, and the units pace is read
  against.
* **A book of labs** is drawn as work, not as a level: a gray bar for the
  share of its labs tried, red when under your line. Under "All textbooks" the
  labs are named under the outlines and not ranked in them; under the labs
  book, Stall points shows which labs the class has not got to run yet. A
  unit of labs has no level and is never a unit a student is behind in. A
  book with work in fewer than four five-day blocks gives too little to judge
  drifting: the page says so, and the figures go blank rather than read as
  zero.

### The pages, in order

The rail lists the pages in order of how much each question helps a teacher
who is teaching the class. It is a judgement, not a measurement, and it lives
in one list (`PRI` in `js/atlas.js`): change the order there and the rail and
the order of a student's flags follow. No number is shown: a first-time
teacher read the numbers on the tabs as counts. Hovering a tab gives the
reason.

| Order | Page | Question it answers | Why it ranks there |
|---|---|---|---|
| 1 | Skills | Which skills are many students weak in, and which first? | What to reteach to the whole class |
| 2 | Engagement and performance | Who is engaged, and is it showing in their performance? | Who needs a reteach, and who needs a nudge |
| 3 | Drifting | Who is drifting, and since when? | Catches a student who is slipping away, early |
| 4 | Ready for a unit | Which unit do you teach next, and is the class ready for it? | What to shore up before the next unit |
| 5 | Stall points | Where do students stall, skip or give up? | Where the material loses students |
| 6 | On pace | Will each student reach the target unit's goal by your date? | Who is projected to miss the selected unit goal |
| 7 | My actions | What have I done, and did it work? | What you did, and whether it worked |

The tabs stay in their three groups (Students, Content, Act and check), each
group listed most helpful first.

Links name the page: `index.html#engagement` (where the pages open), `#skills`
(`#hardest` and `#fading` open its other two views), `#drifting`, `#ready`,
`#stall-points`, `#pace`, `#actions`, and `index.html#s-Sandy` for a
student's profile; the older names `#weak-skills` and `#worked` still open
the page they named, and `#effort` and `#overview` open Engagement and performance. (In the script each page also has a fixed id, used by
flags and the log; the ids are not shown anywhere.)

### The theme and the names

The look and the words are the ALPS app's (`alps-react-app`, read on 16
October 2026; only values were taken from it): its colours (`src/App.css`,
`src/utils/colors.js`, `src/utils/mui-theme.js`), its type, and its names for
what a page measures. `css/atlas.css` and `css/lens.css` hold the same theme
tokens.

* **Type**: Noto Sans, ALPS's typeface, loaded from Google Fonts by
  `index.html` (without a connection the page falls back to Helvetica or
  Arial). 14px body, 20px medium for a page's question (on one line where it
  fits; the filters go under it when they don't fit beside it), 16px medium
  for a card's name, folding or not, 12px for captions. Emphasis is medium weight (500), in charts too.
  Nothing is under 12px.
* **Surfaces**: a white app bar and drawer with hairlines over a grey page;
  each chart or section is a white card with Material's first elevation, and
  so are the answer cards, which only ever sit on the page; they share a row
  while they fit, each between 190 and 270px (the full width on a phone). Corners are 4px on surfaces and 10px on buttons, as in ALPS;
  chips are full pills.
* **Controls**: contained, outlined and text buttons in sentence case; a
  connected toggle group; an outlined select; a slider with a filled track;
  a checkbox that fills with the primary colour. A status is a small tinted
  chip.
* **Spacing** steps by 8px; the page has 24px gutters and a card pads 24px,
  16px between cards; on a phone both are 16px, and a filter row narrows
  its selects to the screen rather than widening the page.

**Names.** ALPS's word wherever the two apps mean the same thing:

| ALPS's word | Was | Where |
|---|---|---|
| Performance, and its levels: Beginning, Attempted, Familiar, Proficient, Mastered | mastery; secure, developing, not yet | every page |
| Engagement | effort, practice done | the scatter, the grid, a profile |
| Engagement and performance | Effort and mastery | the page (`#engagement`; `#effort` still opens it) |
| Struggling | Stuck despite effort | its card, the grid's dot, a student's flag |
| Low engagement | Not doing the work | its card, a student's flag |
| Unavailable (practised, no level yet) | Too early (one check) | a level's key, the grid, a class bar |
| Textbook | book | the filter, the hints |

Where a page acts on a group of levels it names the levels: *mastered*;
*familiar or proficient* (a practice set); *beginning or attempted* (a
group). Groups and verdicts ALPS has no word for keep theirs: on track,
nearly there, coasting, too early to tell, and the pace and weak-skill
statuses. The buttons keep their verbs.

**The levels are ALPS's, cuts included.** A skill's level is the band of its
score: Beginning under 40%, Attempted from 40%, Familiar from 55%, Proficient
from 65%, Mastered from 80% (ALPS's `perf_thresholds`). A unit's level is
ALPS's unit band on the unit's key skills (see "A student's level in a
unit"). ALPS's names on the old cuts would have called students familiar who
are not familiar in ALPS, so the cuts moved with the names: the line between
the two lower groups is 55% (it was 60%), and the unit band replaces the old
standing (a share of key skills secure, with the hard third gating mastered).

**Colours**, one meaning each:

| Colour | Meaning |
|---|---|
| ALPS's performance ramp: gray `#D7D7D7`, then `#E3F2FD`, `#90CAF9`, `#1876D2`, `#0D47A1` | a level, Beginning to Mastered |
| Hatched pale gray in a dashed outline | unavailable: practised, no level yet |
| Empty in a solid outline | not attempted, or not checked twice |
| Green `#408B4D` | right, done, finished, worked, ready |
| Pale green | got there after retries |
| Yellow `#E19F01` | needs a look: guessing, idle, skipped, coasting, under 80% |
| Red `#DC3545` | wrong or failing: struggling, low engagement, gave up, broken, drifting |
| Blue `#1864F2` | primary: links, buttons, the page you are on, and the student or row you picked |
| Gray | recorded, and neutral |
| Hatching | cannot be seen: not in the lesson, not started |

A level is drawn the way ALPS draws it. For one student it is ALPS's battery:
four blocks, as many filled in the level's colour as the level (none for
Beginning), and four dashed outlines when it is unavailable. Attempted's one
block is so pale that it keeps a thin outline in the next blue, or the picked
column's tint would hide it and it would read as Beginning. For a class it is
ALPS's stacked bar, mastered first, its unavailable part hatched. Red stays
off the levels, for the two problem marks: the engagement line under a cell
when it is under your line (yellow when coasting), and the dot for
struggling. White text sits only on the two darkest blues and on red: under
white, ALPS's green fails 4.5:1, so nothing white is written on it.

The page uses the whole window, and every chart is drawn to the width it is
given, so its text stays the size of the text around it; charts are drawn
again when the window changes size. A chart is given the full width only when
that suits it: the grid's columns share the row (ten at a time, with the last
page stepping back so it is full too), and so do the tables. Every other
chart takes about three fifths of the row beside its panel, or half of it
beside a second chart, once the window is wide enough for both (`duoW` in
`js/atlas.js` decides; below that they stack). The rows of the Skills page run
from the first day of work to a little after the latest: nothing is drawn
after that, so an idle stretch is left off.

The current script uses private color names (`--il-good`, `--il-bad`,
`--il-watch`, `--il-accent` …). Scoped declarations in `css/atlas.css` resolve
them through `css/alps-theme.css`, which reads ALPS’s public theme tokens
without redefining them. See [ALPS integration](reports/alps-integration.md).

### Files

```
index.html               standalone entry point and mount root
css/atlas.css            its styles, in the ALPS app's theme
data/class.js            the class, exported from the database (facts only)
data/example.js          the example with three more books: real outlines, invented work, and it says so
data/prereqs.js          what each unit builds on, two levels back, from the learner model's skill graph, and ALPS's level on each of those skills
js/atlas.js              mount API, shell, data layer, pages, profiles, events
js/alps-design-system.js generated ALPS icon and semantic color contract
css/alps-theme.css       generated host theme bridge
tools/sync-alps-design-system.js  snapshots/checks the ALPS visual contract
tools/export-atlas.py    writes data/class.js from the database, every book the section lists
tools/make-example.py    writes data/example.js from data/class.js and the database
tools/export-prereqs.py  writes data/prereqs.js from the database and the skill graph file
reports/                 the multi-book write-up, and the first-time-teacher review with its afterword on what was built
```

`node tools/check.js --checks` also checks this mock: no text under 12px in
`css/atlas.css`, text colors at 4.5:1, shared theme fallbacks and lifecycle isolation, and that `data/class.js` is whole (every result points at a
student and a question that exist, one result per pair, names only for
students), that the export takes its password from the environment, and that
no chart takes the full page width by itself (each is handed its width and
paired with its panel or a second chart). It also holds the rules for a
class with several books: a class with one is drawn as it always was, every
page has the same filter, a level does not change with the book, a lab is
never a check, and the example keeps real and invented apart and was built
for this very export. And the rules behind what a teacher sees first: one
level on the grid and the profile, ALPS's unit band read from a unit's key skills; no
overview page; no invented rows; no priority numbers; the
skills pages as one; the weak-skills line is the share mastered, so lower is worse; every "How to read" at fifty words or so;
every action one of the four a teacher can take; time in dates, with
today the export date, recent the last five days, and no class day assumed;
and the prerequisite tree, read only from a graph file built for this very
export, starting from question tags above 50% relevance, with a ring only
where eight students were checked, read at the level picked on the readiness
line (a higher level never says the class is more ready), a taught symbol under every skill, and
the evidence's depth and date on hover. And ALPS's theme and words: its
colours and Noto Sans, its five levels at its cuts, a level drawn as its
battery or its stacked bar, and none of the old words (secure, not yet,
developing, effort and mastery) on screen.

The asset links carry a version (`?v=43`). Raise it when the stylesheet, the
script or the data changes, so a normal reload never pairs a new script with
an old stylesheet.

`data/class.js` holds per-student records. They come from the anonymised copy,
but decide before committing whether the file belongs in the repository.

---

# The earlier mock (`lens.html`)

A clickable mock of the Insight Lens design in
`insight-lens/research/insight-lens-information-architecture.md`. Two demo sections
and five test shapes, a full term of simulated student work, and every insight
computed from that work rather than typed in by hand.

The goal of the screen: a teacher opens it, sees the state of the class in a few
seconds, and knows what to do next.

## Open it

```
open lens.html
```

Deep links work and are shareable:

```
lens.html#/s1/understanding               a section and a tab
lens.html#/s2/students?view=signal        a sub-view
lens.html#/s1/students/s1-14              one student
lens.html#/s1/understanding?win=1w        a time window
lens.html#/s1/followups?focus=fu-s1-act3  one item on a tab, scrolled to and outlined
lens.html#/s1/understanding?path=csa2:4,csa2:4.4   a place in the outline: chapter, then subunit
```

## The sections

The section picker in the top bar lists the two demo sections, then the test shapes.

| | **AP Computer Science A · Period 2** | **Introduction to Python · Block B** |
|---|---|---|
| Students | 32 | 24 rostered, 2 never signed in, 1 active account not on the roster |
| Textbooks | CS Awesome 2.0 (primary), Java Short Labs, Be Prepared for the AP CS Exam | Foundations of Python Programming (primary), Logic Gym |
| How they work | mostly in class — Mon and Thu around 10:00 | mostly homework — evenings and weekends |
| Bands | available | **not** available for this skill set |
| What stands out | a weak skill the next subunit builds on; chapter 3 skipped; completion decaying through chapter 4; 68 submissions to grade; a check-in that did not work | well below typical, with a class-wide dip; an 11-day-old grading queue; a roster problem; three students quiet for three weeks |

**Test shapes** exist to show that the same rules hold on data they were not tuned
for. Each is generated the same way as the demo sections.

| Section | Shape | What it lacks |
|---|---|---|
| Tiny seminar | 6 students | nothing; thresholds must scale down |
| New cohort | 20 students, started last week | two (and four) class weeks of work |
| Self-paced Python | 18 students, no assignments or due dates | assigned work, a shared class time, a second textbook |
| Lecture cohort | 150 students | nothing; thresholds and lists must scale up |
| Single textbook | 22 students, bare data | typical results, a prerequisite map, code questions, bands, a second textbook |

The simulated "today" is **Monday 16 November 2026, 07:30**; the teacher last
opened the Lens on Tuesday 10 November. Term started Monday 24 August.

## How the Lens decides what to show

Everything the Lens says is declared once, in `js/04b-insights.js`. Each card has
one record: what it needs from the data, its time basis, its trigger rule, the
list its headline counts, a "nothing notable" headline, and the findings it
raises. A finding names who it affects, how badly, how soon, which skills or
units it is about, and the exact list its action will act on.

The Brief, the tab counts, the card headlines, the student flags and the button
labels are all read from those records. That is what keeps them from
contradicting each other, and what makes a new section or a new insight behave
the same way without extra work.

**Ranking.** A finding's impact is *share of the roster affected × severity ×
urgency*. There are no fixed slots by type. Students nobody has followed up yet
weigh more than students already being followed up.

**Grouping by cause.** Findings that share a skill are shown as one theme with
one recommended action. A finding also joins a weak skill's theme when the
prerequisite map links them *and* at least half its students are below on that
skill. Student-level findings are grouped by kind (not showing up, working and
not getting there, working habits), one row per student with every reason.
Where questions carry no skill, findings group by unit.

**The Brief** answers two questions that never compete for rows: *what to teach
or fix* (2 to 5 themes) and *who to check on* (1 to 3). Each list shows every
theme above the impact threshold; the rest sit under "lower impact". Grading
and replies stay in the "Waiting on you" tile, and good news has its own lines.
The written brief is built from the same themes: the class in one line, the
teaching priority, who to check on.

**Tabs** open with a map of the class, then every card that fired as one row,
most important first; a row's full analysis opens in place. Cards with nothing
notable, and cards the data cannot support, are one line each. Each tab shows a
count of its cards that fired.

**Missing data.** A card states what it needs: assigned work, typical results,
a prerequisite map, code questions, bands, a second textbook, two or four class
weeks, a shared class time. Where the section lacks one, the card says so and
shows no figure.

**Thresholds** are a share of the roster with a floor, and evidence minimums
scale with class size, so a class of 6 and a class of 150 both work.

## How every screen is laid out

Each finding is one row, read left to right under three headings:

| What we see | How we know | What to do, and why |
|---|---|---|
| a short title and a few facts as chips | one small picture of the evidence | one action, the reason it follows, and one alternative |

* **Few words.** A row has a title, up to three chips, and one line of reason
  beside the button. Sentences, rules and caveats are in the full analysis.
* **Two evidence forms.** Labelled bars on one scale (a few words above them say
  what they measure), or named students. Where the finding is about students,
  each student is a bar on the measure that put them there.
* **Amber is who the action is for.** The amber bar or the amber name is the
  group the button acts on, so the number on a button can be checked against
  the picture beside it.
* **Full analysis opens in place** under its row: on the Brief, the findings
  behind it, each question or student, and other actions; on a tab, the card's
  own chart with how it is worked out.
* **One filled button** per list: the first row. The rest are outlined.

The row is drawn by `js/05b-rows.js` from the shared insight records, so the
Brief and every tab word and picture a finding the same way.

**Brief.** One sentence on the class, then four readings in the same form
(showing up, assigned work, understanding, waiting on you), each marked *On
track* or *Needs attention*. Then three rows to teach or fix and two to check
on, with the rest one click away. Where the practice sets shown would go to
many of the same students, a line offers one combined set. *Did it work?* and
*Good news* use the same three columns.

**Progress, Understanding, Engagement, Work habits.** A compact map first
(the outline of the textbook on Progress and Understanding, weekly
participation on Engagement), then one row per card that has something to look
at, most important first. A card that lists several things of one kind (weak skills,
questions to reteach) shows them as bars, with the one the action is for in
amber.

**The outline, and drilling into it.** Progress and Understanding open on every
chapter of the textbook, started or not, in textbook order. Selecting a chapter
shows all of its subunits; selecting a subunit shows its skills (the ones it
teaches, then any other skill its questions are tagged with); selecting a skill
opens its questions, the students under 35% on it, and a practice set for them.
Progress shows done / in progress / not started at each level; Understanding
shows right first time against typical, and learning bands where they exist.

* **Nothing is opened for the teacher.** The map starts at all chapters. No
  chapter is marked as where the class "is"; the headline says which chapters
  most of the class has started and which have not been started.
* **One position, three places.** The place in the outline is shared by
  Progress, Understanding and the Students grid, and is part of the link
  (`?path=`), so a unit opened in one is the unit shown in the others.
* **Ways in from a finding.** A weak skill's full analysis links to the
  subunits it sits in; a finding about a chapter opens the map at that chapter.

Findings that are about one chapter (pace, skills with no questions, what the
next subunit needs) use the chapter most of the class started most recently,
worked out from the work itself, and name it. The Window control names it too
("Latest chapter started (4)").

**Students.** Opens on *Who needs what*: one row per flagged student with the
reasons, three small pictures of their work and a next step. Students with
nothing flagged are one click away. One filter control replaces the row of
flag chips. In *By chapter*, a cell is one colour and one number; completion,
activity and learning bands are in its tooltip and its evidence drawer.

**Follow-ups.** Each action is a row: what happened, before and after, the
next step. *Each student* opens under the row. Thresholds are folded away at
the bottom.

The earlier Brief is no longer a tab; it still opens at
`lens.html#/s1/briefOld`.

The asset links in `lens.html` carry a version (`?v=4`). Raise it when the
stylesheet or a script changes, so a normal reload never pairs new scripts
with an old stylesheet.

## What is real and what is not

**Computed from the simulated work** — everything with a number on it. The
generator simulates individual attempts (each with a timestamp, a duration, a
chosen option or a code run and its error), and every figure is derived from
those attempts by `js/04-metrics.js`.

**Interactive** — section and tab switching, textbook and window scoping, every
evidence drawer, opening a headline in place, the theme lifecycle (Done / Not
now, with feedback in a menu, and "Put back"), the practice-set builder
(reading each question before assigning, removing questions, changing the
recipe and time budget, assigning), "Hide names", sorting and filtering
students by flag, the table view on cards that offer one, and the threshold
controls.

**Assigning and checking in actually do something**: each creates a follow-up
with a recheck date that appears on the Follow-ups tab, and the students
involved then count as followed up.

**Static** — buttons that would leave the Lens (Open grading, Generate
questions, Remind, Re-invite, Reply) show a toast saying what they would do.
Nothing persists across a reload; state lives in memory only.

**Not built**: dark mode, keyboard shortcuts beyond tab and enter, printing, and
the "More options…" path in the builder. Question wording in the builder's
preview is sample text.

## Tabs

| Tab | Question it answers |
|---|---|
| Brief | What needs me this week, and why? |
| Progress | Where is the class in the material, and is assigned work getting done? |
| Understanding | What do they get, what don't they, and why? |
| Engagement | Who is showing up, and when? |
| Work habits | How are they working? |
| Students | Who needs what? |
| Follow-ups | What did I do, and did it help? |

Each card has an **i** button. It shows how the card is worked out, what to read
with care, its time basis and its design reference (BR-1 … FU-3), so a card can
be matched to the section of the design document that specifies it.

**Scope controls** appear only where something uses them. The Window control is
shown on tabs with at least one card that follows it. A card whose time basis
differs from the selected window says so beside its title ("whole term", "right
now", "recent assignments").

## Students

Lists open with the students who need attention first: the order is the number
and seriousness of each student's flags, and the flags are the same ones that
feed the Brief. There is no overall score. A-to-Z is an option, and each flag is
a filter. Rosters longer than 40 show the first 40 and offer the rest.

The **By chapter** grid goes three levels deep, through the breadcrumb or by
selecting a column heading:

```
All chapters  ›  4 Data Collections  ›  4.4 Array Traversals
   chapters          subunits               skills assessed there
```

* **Chapters and subunits**: the cell's colour and its number are the same
  quantity, right first time. Completion, recorded activity and, where one
  exists, a learning band are in the tooltip and the evidence drawer.
* **Skills** usually carry three or four questions, so those cells show **one
  dot per question**; the percentage appears once a student has answered three.

The grid shows one textbook at a time and says which. **Textbooks side by
side** shows every attached textbook at chapter level.

A **student page** opens with a one-line reading and a suggested next step.
Previous and next walk the list the teacher came from.

## Checking the rules

```
node tools/check.js            insights for the demo sections, then the checks on every section
node tools/check.js --all      insights for every section
node tools/check.js --checks   the checks only
```

The data, metric and insight files load in Node as well as the browser, so this
runs the same code the interface does. The checks are the rules above, run
against all seven sections in every scope, and the script exits with status 1 if
one fails:

* each Brief list is in order of impact and leads with its highest-impact finding;
* every fired finding has a row on the Brief, and every fired card can raise one;
* a card that lacks its data never fires or shows a figure;
* a headline's count equals the rows beneath it;
* a button's number is the length of the list it acts on;
* numbers with the same name match across tabs, and groups add up to the roster;
* follow-up outcomes are exhaustive, each student counted once;
* no quiet student, and no student who never signed in, sits in a performance group;
* a skill counted as waiting on a gap is in a unit the class will reach;
* no text is set under 12px, and text colours meet 4.5:1 on their surfaces.

## Width

The page has no fixed maximum width: every tab uses the whole window. Charts that
can fill a column are measured after layout and drawn at that exact width, so
their type and marks stay the same size whatever the window is. Prose keeps a
readable line length while tables and charts do not.

Below 900px the side rail collapses and everything is one column, Brief first.

## Files

```
lens.html            loads the scripts in order
css/lens.css         all styling; one light theme
js/01-util.js        seeded random numbers, time helpers
js/02-content.js     textbooks, chapters, skills, named questions, the demo sections and test shapes
js/03-generate.js    simulates the term attempt by attempt
js/04-metrics.js     every metric in the design document, computed from those attempts
js/04b-insights.js   one record per card and per finding; ranking, grouping, student flags, the written brief
js/05-charts.js      the visual forms, and the card component
js/05b-rows.js       the row every screen is built from: what we see, how we know, what to do and why
js/06-shell.js       frame, routing, tab layout (map, then rows), drawers, actions, the builder
js/07-tabs-a.js      Brief, Progress, Understanding
js/08-tabs-b.js      Engagement, Work habits, Students, Follow-ups
js/08b-brief.js      the Brief: class status, then rows (the earlier Brief stays in 07-tabs-a)
js/09-app.js         start
tools/check.js       prints the insights and runs the checks
tools/smoke.js       a quick look at the generated world
```

The data is deterministic: each section has a fixed seed, so the same student has
the same story on every load, and a screenshot stays valid.

To add a section, add a spec to `js/02-content.js`. A spec can set `startWeek`,
`selfPaced`, `norms: false`, `graph: false`, `noCode: true`, `bands` and any
roster size; nothing else needs to change.

## Reading the marks

One colour, one meaning:

| Colour | Meaning |
|---|---|
| Blue | done, right, active |
| Mid blue | got there with more tries |
| Pale blue | in progress |
| Red | wrong, still failing |
| Amber | needs attention: late, flagged, below typical |
| Purple | waiting on the teacher: to grade, to reply |
| Green | improved, good news |
| Grey fill | recorded, and neutral |
| Outline | not started |
| Hatching | cannot be seen, which is different from zero |

* Scales that run from weak to strong (grid cells, learning bands) go amber,
  through a neutral middle, to blue. The cells that need attention carry the
  most colour.
* **A student is a bubble that says who it is.** Where there is room, a bubble
  carries the student's initials (their number when names are hidden); selecting
  it opens that student. Bubbles that would overlap merge into one that shows a
  count. The form follows the Student Breakdown graph in the ALPS app.
* **The activity map is a quadrant map.** Its axes cross in the middle at the
  class medians and are named in words at their ends. Each half of an axis is
  stretched on its own so the class fills the plot; exact values are in the
  tooltip and the table view. Pointing at a name lights its bubble.
* **Attention is the only colour among students.** Flagged bubbles are amber and
  keep readable initials even in a crowded strip; everyone else is neutral.
* **Where one part is the point, only that part is coloured.** Start timing shows
  the late share in amber on a neutral bar. Learning bands are a bar centred on
  the middle band, weaker bands to the left.
* A class too large for one bubble each is drawn as columns of counts.
* **A comparison always draws its reference**: ┃ is the class or the typical
  result, and the bar runs from the value to it.
* Every mark has a visible label, legend or count. Tooltips add detail only.
* "Against typical" has one definition: the class and the typical result on the
  same questions, with the words *near*, *below* or *well below typical*.

## Known limits of the mock

* The typical results, the prerequisite map and the item statistics are
  simulated with plausible shapes, not copied from production.
* Hint use is shown as "not recorded" on Work habits, because that signal is not
  reliably in the data today.
* Follow-up comparisons are "after", never "because of": students picked because
  they were lowest on a skill tend to rise somewhat on any recheck.
* The impact weights (severity per finding, the follow-up discount, the 0.15
  threshold) are first values chosen by judgement, not fitted to teacher behaviour.
